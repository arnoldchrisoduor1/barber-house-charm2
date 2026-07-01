package pos

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	bookingmod "github.com/haus-of-wellness/api/internal/modules/booking"
	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	retailmod "github.com/haus-of-wellness/api/internal/modules/retail"
	servicesmod "github.com/haus-of-wellness/api/internal/modules/services"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

var (
	ErrEmptyCart          = errors.New("cart is empty")
	ErrInsufficientStock  = errors.New("insufficient stock")
	ErrInvalidCatalogItem = errors.New("invalid catalog item")
	ErrInsufficientCash   = errors.New("insufficient cash tendered")
	ErrInvalidPayment     = errors.New("invalid payment method")
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Transaction, error) {
	var rows []Transaction
	err := r.db.WithContext(ctx).
		Scopes(platformtenancy.OrgScope(orgID), platformtenancy.OptionalBranchScope(branchID)).
		Preload("Items").
		Order("created_at DESC").
		Limit(50).
		Find(&rows).Error
	return rows, err
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Transaction, error) {
	var row Transaction
	err := r.db.WithContext(ctx).
		Scopes(platformtenancy.OrgScope(orgID)).
		Preload("Items").
		First(&row, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	return &row, err
}

type resolvedLine struct {
	ItemType     string
	ItemID       uuid.UUID
	Name         string
	UnitPriceKES int
	Quantity     int
	LineTotalKES int
}

type CheckoutInput struct {
	CustomerID    *uuid.UUID
	BranchID      *uuid.UUID
	BookingID     *uuid.UUID
	PaymentMethod string
	Reference     string
	CashTendered  *int
	Lines         []CheckoutLineInput
}

type CheckoutLineInput struct {
	ItemType string
	ItemID   uuid.UUID
	Quantity int
}

func (r *Repository) Checkout(ctx context.Context, orgID uuid.UUID, input CheckoutInput) (*Transaction, error) {
	if len(input.Lines) == 0 {
		return nil, ErrEmptyCart
	}

	method := input.PaymentMethod
	if method == "" {
		method = "cash"
	}
	switch method {
	case "cash", "mpesa", "card":
	default:
		return nil, ErrInvalidPayment
	}

	var created Transaction
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		resolved, total, err := r.resolveLines(tx, orgID, input.Lines)
		if err != nil {
			return err
		}

		if method == "cash" && input.CashTendered != nil && *input.CashTendered < total {
			return ErrInsufficientCash
		}

		if input.BookingID != nil {
			var booking bookingmod.Booking
			if err := tx.Scopes(platformtenancy.OrgScope(orgID)).
				First(&booking, "id = ?", *input.BookingID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return ErrInvalidCatalogItem
				}
				return err
			}
			if booking.Status != "scheduled" {
				return fmt.Errorf("booking is not billable")
			}
			if input.CustomerID == nil {
				cid := booking.CustomerID
				input.CustomerID = &cid
			}
			if input.BranchID == nil {
				input.BranchID = booking.BranchID
			}
		}

		if input.CustomerID != nil {
			var count int64
			if err := tx.Model(&crmmod.Customer{}).
				Scopes(platformtenancy.OrgScope(orgID)).
				Where("id = ?", *input.CustomerID).
				Count(&count).Error; err != nil {
				return err
			}
			if count == 0 {
				return ErrInvalidCatalogItem
			}
		}

		created = Transaction{
			OrganizationID: orgID,
			BranchID:       input.BranchID,
			CustomerID:     input.CustomerID,
			BookingID:      input.BookingID,
			AmountKES:      total,
			PaymentMethod:  method,
			PaymentStatus:  "completed",
			Reference:      input.Reference,
		}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}

		items := make([]TransactionItem, 0, len(resolved))
		for _, line := range resolved {
			items = append(items, TransactionItem{
				OrganizationID: orgID,
				TransactionID:  created.ID,
				ItemType:       line.ItemType,
				ItemID:         line.ItemID,
				Name:           line.Name,
				UnitPriceKES:   line.UnitPriceKES,
				Quantity:       line.Quantity,
				LineTotalKES:   line.LineTotalKES,
			})
		}
		if err := tx.Create(&items).Error; err != nil {
			return err
		}
		created.Items = items

		for _, line := range resolved {
			if line.ItemType != "product" {
				continue
			}
			result := tx.Model(&retailmod.Product{}).
				Scopes(platformtenancy.OrgScope(orgID)).
				Where("id = ? AND quantity >= ?", line.ItemID, line.Quantity).
				Update("quantity", gorm.Expr("quantity - ?", line.Quantity))
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return ErrInsufficientStock
			}
		}

		if input.CustomerID != nil {
			now := time.Now()
			earned := total / 100
			if err := tx.Model(&crmmod.Customer{}).
				Scopes(platformtenancy.OrgScope(orgID)).
				Where("id = ?", *input.CustomerID).
				Updates(map[string]any{
					"total_spent":    gorm.Expr("total_spent + ?", total),
					"total_visits":   gorm.Expr("total_visits + 1"),
					"loyalty_points": gorm.Expr("loyalty_points + ?", earned),
					"last_visit_at":  now,
				}).Error; err != nil {
				return err
			}
		}

		if input.BookingID != nil {
			result := tx.Model(&bookingmod.Booking{}).
				Scopes(platformtenancy.OrgScope(orgID)).
				Where("id = ? AND status = ?", *input.BookingID, "scheduled").
				Update("status", "completed")
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return fmt.Errorf("booking could not be completed")
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *Repository) resolveLines(tx *gorm.DB, orgID uuid.UUID, lines []CheckoutLineInput) ([]resolvedLine, int, error) {
	resolved := make([]resolvedLine, 0, len(lines))
	total := 0

	for _, line := range lines {
		if line.Quantity <= 0 {
			return nil, 0, fmt.Errorf("invalid quantity for item")
		}

		switch line.ItemType {
		case "service":
			var svc servicesmod.Service
			err := tx.Scopes(platformtenancy.OrgScope(orgID)).
				Where("id = ? AND is_active = true", line.ItemID).
				First(&svc).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, 0, ErrInvalidCatalogItem
			}
			if err != nil {
				return nil, 0, err
			}
			lineTotal := svc.PriceKES * line.Quantity
			resolved = append(resolved, resolvedLine{
				ItemType:     "service",
				ItemID:       svc.ID,
				Name:         svc.Name,
				UnitPriceKES: svc.PriceKES,
				Quantity:     line.Quantity,
				LineTotalKES: lineTotal,
			})
			total += lineTotal
		case "product":
			var product retailmod.Product
			err := tx.Scopes(platformtenancy.OrgScope(orgID)).
				Where("id = ? AND is_active = true", line.ItemID).
				First(&product).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, 0, ErrInvalidCatalogItem
			}
			if err != nil {
				return nil, 0, err
			}
			if product.Quantity < line.Quantity {
				return nil, 0, ErrInsufficientStock
			}
			lineTotal := product.PriceKES * line.Quantity
			resolved = append(resolved, resolvedLine{
				ItemType:     "product",
				ItemID:       product.ID,
				Name:         product.Name,
				UnitPriceKES: product.PriceKES,
				Quantity:     line.Quantity,
				LineTotalKES: lineTotal,
			})
			total += lineTotal
		default:
			return nil, 0, ErrInvalidCatalogItem
		}
	}

	return resolved, total, nil
}

func (r *Repository) Create(ctx context.Context, tx *Transaction) error {
	return r.db.WithContext(ctx).Create(tx).Error
}
