package pos

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	ledgermod "github.com/haus-of-wellness/api/internal/modules/ledger"
	platformmod "github.com/haus-of-wellness/api/internal/modules/platform"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type QueuePublisher interface {
	PublishQueue(ctx context.Context, orgID uuid.UUID, eventType string, payload any) error
}

// CommissionRecorder writes the immutable commission line for a completed sale. Satisfied
// by payroll.Service; kept as an interface here so pos doesn't import payroll's package tree.
type CommissionRecorder interface {
	RecordCommissionLine(ctx context.Context, orgID, staffID uuid.UUID, txID uuid.UUID, bookingID *uuid.UUID, serviceID *uuid.UUID, baseKES int64) error
}

// CheckoutNotifier queues post-checkout comms (e.g. review request).
type CheckoutNotifier interface {
	EnqueueReviewRequest(ctx context.Context, orgID uuid.UUID, customerID *uuid.UUID, phone string, txID uuid.UUID) error
}

type Service struct {
	repo       *Repository
	ledger     *ledgermod.Service
	publisher  QueuePublisher
	audit      *platformmod.Service
	commission CommissionRecorder
	review     CheckoutNotifier
}

func NewService(repo *Repository, ledger *ledgermod.Service, publisher QueuePublisher, audit *platformmod.Service, commission CommissionRecorder, review CheckoutNotifier) *Service {
	return &Service{repo: repo, ledger: ledger, publisher: publisher, audit: audit, commission: commission, review: review}
}

type CreateTransactionDTO struct {
	AmountKES     int        `json:"amount_kes"`
	PaymentMethod string     `json:"payment_method"`
	BranchID      *uuid.UUID `json:"branch_id"`
	CustomerID    *uuid.UUID `json:"customer_id"`
	Reference     string     `json:"reference"`
}

type CheckoutLineDTO struct {
	ItemType string    `json:"itemType"`
	ItemID   uuid.UUID `json:"itemId"`
	Quantity int       `json:"quantity"`
}

type CheckoutDTO struct {
	CustomerID      *uuid.UUID        `json:"customerId"`
	BranchID        *uuid.UUID        `json:"branchId"`
	BookingID       *uuid.UUID        `json:"bookingId"`
	StaffID         *uuid.UUID        `json:"staffId"`
	PaymentMethod   string            `json:"paymentMethod"`
	Reference       string            `json:"reference"`
	CashTendered    *int              `json:"cashTendered"`
	DiscountPercent int               `json:"discountPercent"`
	ManagerPIN      string            `json:"managerPin"`
	Lines           []CheckoutLineDTO `json:"lines"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Transaction, error) {
	return s.repo.List(ctx, orgID, branchID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Transaction, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Checkout(ctx context.Context, orgID uuid.UUID, actorID *uuid.UUID, dto CheckoutDTO) (*Transaction, error) {
	if dto.DiscountPercent > 0 {
		if err := s.ValidateManagerPIN(ctx, orgID, dto.ManagerPIN); err != nil {
			return nil, err
		}
		if dto.DiscountPercent > 50 {
			dto.DiscountPercent = 50
		}
	}

	lines := make([]CheckoutLineInput, 0, len(dto.Lines))
	for _, line := range dto.Lines {
		lines = append(lines, CheckoutLineInput{
			ItemType: line.ItemType,
			ItemID:   line.ItemID,
			Quantity: line.Quantity,
		})
	}

	tx, err := s.repo.Checkout(ctx, orgID, CheckoutInput{
		CustomerID:      dto.CustomerID,
		BranchID:        dto.BranchID,
		BookingID:       dto.BookingID,
		StaffID:         dto.StaffID,
		PaymentMethod:   dto.PaymentMethod,
		Reference:       dto.Reference,
		CashTendered:    dto.CashTendered,
		DiscountPercent: dto.DiscountPercent,
		Lines:           lines,
	})
	if err != nil {
		return nil, err
	}

	if s.ledger != nil {
		ref := fmt.Sprintf("pos:%s", tx.ID.String())
		if err := s.ledger.RecordCollection(ctx, orgID, int64(tx.AmountKES), ref, &tx.ID); err != nil {
			return nil, err
		}
	}
	if s.commission != nil && tx.StaffID != nil {
		var serviceID *uuid.UUID
		for _, line := range dto.Lines {
			if line.ItemType == "service" {
				id := line.ItemID
				serviceID = &id
				break
			}
		}
		if err := s.commission.RecordCommissionLine(ctx, orgID, *tx.StaffID, tx.ID, tx.BookingID, serviceID, int64(tx.AmountKES)); err != nil {
			// Commission attribution failure must not roll back a completed, paid sale;
			// log via audit trail so finance can reconcile, and surface via realtime below.
			if s.audit != nil {
				meta, _ := json.Marshal(map[string]any{"transaction_id": tx.ID, "error": err.Error()})
				_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "commission.line_failed", "transaction", &tx.ID, meta)
			}
		}
	}
	if s.publisher != nil {
		_ = s.publisher.PublishQueue(ctx, orgID, "payment.completed", map[string]any{
			"transaction_id": tx.ID,
			"amount_kes":     tx.AmountKES,
		})
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{
			"amount_kes":     tx.AmountKES,
			"payment_method": tx.PaymentMethod,
		})
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "payment.completed", "transaction", &tx.ID, meta)
	}
	if s.review != nil && dto.CustomerID != nil {
		if phone, err := s.repo.GetCustomerPhone(ctx, orgID, *dto.CustomerID); err == nil && phone != "" {
			_ = s.review.EnqueueReviewRequest(ctx, orgID, dto.CustomerID, phone, tx.ID)
		}
	}

	return tx, nil
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto CreateTransactionDTO) (*Transaction, error) {
	method := dto.PaymentMethod
	if method == "" {
		method = "cash"
	}
	tx := &Transaction{
		OrganizationID: orgID,
		BranchID:       dto.BranchID,
		CustomerID:     dto.CustomerID,
		AmountKES:      dto.AmountKES,
		PaymentMethod:  method,
		PaymentStatus:  "pending",
		Reference:      dto.Reference,
	}
	if err := s.repo.Create(ctx, tx); err != nil {
		return nil, err
	}
	return tx, nil
}
