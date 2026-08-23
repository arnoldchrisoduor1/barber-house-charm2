package shop

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	retailmod "github.com/haus-of-wellness/api/internal/modules/retail"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListOrders(ctx context.Context, orgID uuid.UUID, status string) ([]Order, error) {
	var rows []Order
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Preload("Items")
	if status != "" {
		q = q.Where("status = ?", status)
	}
	err := q.Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetOrder(ctx context.Context, orgID, id uuid.UUID) (*Order, error) {
	var row Order
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Preload("Items").First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreateOrder(ctx context.Context, order *Order, items []OrderItem) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].OrderID = order.ID
			items[i].OrganizationID = order.OrganizationID
		}
		if len(items) > 0 {
			if err := tx.Create(&items).Error; err != nil {
				return err
			}
		}
		order.Items = items
		return nil
	})
}

func (r *Repository) SaveOrder(ctx context.Context, orgID uuid.UUID, order *Order) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Session(&gorm.Session{FullSaveAssociations: false}).Save(order).Error
}

func (r *Repository) AdvanceAndMaybeDecrement(ctx context.Context, orgID, id uuid.UUID, nextStatus string) (*Order, error) {
	var out *Order
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var order Order
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Scopes(platformtenancy.OrgScope(orgID)).
			Preload("Items").
			First(&order, "id = ?", id).Error; err != nil {
			return err
		}

		now := time.Now().UTC()
		order.Status = nextStatus
		switch nextStatus {
		case "fulfilled":
			order.FulfilledAt = &now
			if !order.StockDecremented {
				for _, item := range order.Items {
					if item.ProductID == nil {
						continue
					}
					result := tx.Model(&retailmod.Product{}).
						Scopes(platformtenancy.OrgScope(orgID)).
						Where("id = ? AND quantity >= ?", *item.ProductID, item.Quantity).
						Update("quantity", gorm.Expr("quantity - ?", item.Quantity))
					if result.Error != nil {
						return result.Error
					}
					if result.RowsAffected == 0 {
						return fmt.Errorf("insufficient stock for %s", item.ProductName)
					}
				}
				order.StockDecremented = true
			}
		case "cancelled":
			order.CancelledAt = &now
		}

		if err := tx.Scopes(platformtenancy.OrgScope(orgID)).Save(&order).Error; err != nil {
			return err
		}
		out = &order
		return nil
	})
	return out, err
}

func (r *Repository) LoadActiveProducts(ctx context.Context, orgID uuid.UUID, category string) ([]retailmod.Product, error) {
	var rows []retailmod.Product
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Where("is_active = true")
	if category != "" {
		q = q.Where("category = ?", category)
	}
	err := q.Order("name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetProduct(ctx context.Context, orgID, id uuid.UUID) (*retailmod.Product, error) {
	var row retailmod.Product
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Where("is_active = true").First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) ProductQty(ctx context.Context, orgID, id uuid.UUID) (int, error) {
	var qty int
	err := r.db.WithContext(ctx).Model(&retailmod.Product{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("id = ?", id).
		Select("quantity").
		Scan(&qty).Error
	return qty, err
}

func (r *Repository) NextOrderNumber(ctx context.Context, orgID uuid.UUID) (string, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&Order{}).Scopes(platformtenancy.OrgScope(orgID)).Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("SO-%05d", count+1), nil
}

func (r *Repository) DashboardStats(ctx context.Context, orgID uuid.UUID) (map[string]any, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	var salesToday int64
	_ = r.db.WithContext(ctx).Model(&Order{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("status = ? AND created_at >= ?", "fulfilled", today).
		Select("COALESCE(SUM(total_kes),0)").Scan(&salesToday)

	var pending int64
	_ = r.db.WithContext(ctx).Model(&Order{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("status IN ?", []string{"pending", "ready"}).
		Count(&pending)

	var lowStock int64
	_ = r.db.WithContext(ctx).Model(&retailmod.Product{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("is_active = true AND quantity <= reorder_level").
		Count(&lowStock)

	var stockValue int64
	_ = r.db.WithContext(ctx).Model(&retailmod.Product{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("is_active = true").
		Select("COALESCE(SUM(quantity * cost_kes),0)").Scan(&stockValue)

	type seller struct {
		ProductName string `json:"product_name"`
		Qty         int64  `json:"qty"`
	}
	var top []seller
	_ = r.db.WithContext(ctx).Table("shop_order_items i").
		Select("i.product_name, SUM(i.quantity) AS qty").
		Joins("JOIN shop_orders o ON o.id = i.order_id").
		Where("i.organization_id = ? AND o.status = ?", orgID, "fulfilled").
		Group("i.product_name").
		Order("qty DESC").
		Limit(5).
		Scan(&top)

	var orderCount int64
	var basketAvg float64
	_ = r.db.WithContext(ctx).Model(&Order{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("status = ? AND created_at >= ?", "fulfilled", today).
		Count(&orderCount)
	if orderCount > 0 {
		basketAvg = float64(salesToday) / float64(orderCount)
	}

	return map[string]any{
		"sales_today_kes":     salesToday,
		"avg_basket_kes":      int64(basketAvg),
		"pending_orders":      pending,
		"low_stock_count":     lowStock,
		"stock_value_kes":     stockValue,
		"top_sellers":         top,
		"fulfilled_today":     orderCount,
	}, nil
}
