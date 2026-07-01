package pos

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	ledgermod "github.com/haus-of-wellness/api/internal/modules/ledger"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Service struct {
	repo   *Repository
	ledger *ledgermod.Service
}

func NewService(repo *Repository, ledger *ledgermod.Service) *Service {
	return &Service{repo: repo, ledger: ledger}
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
	CustomerID    *uuid.UUID        `json:"customerId"`
	BranchID      *uuid.UUID        `json:"branchId"`
	BookingID     *uuid.UUID        `json:"bookingId"`
	PaymentMethod string            `json:"paymentMethod"`
	Reference     string            `json:"reference"`
	CashTendered  *int              `json:"cashTendered"`
	Lines         []CheckoutLineDTO `json:"lines"`
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

func (s *Service) Checkout(ctx context.Context, orgID uuid.UUID, dto CheckoutDTO) (*Transaction, error) {
	lines := make([]CheckoutLineInput, 0, len(dto.Lines))
	for _, line := range dto.Lines {
		lines = append(lines, CheckoutLineInput{
			ItemType: line.ItemType,
			ItemID:   line.ItemID,
			Quantity: line.Quantity,
		})
	}

	tx, err := s.repo.Checkout(ctx, orgID, CheckoutInput{
		CustomerID:    dto.CustomerID,
		BranchID:      dto.BranchID,
		BookingID:     dto.BookingID,
		PaymentMethod: dto.PaymentMethod,
		Reference:     dto.Reference,
		CashTendered:  dto.CashTendered,
		Lines:         lines,
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
