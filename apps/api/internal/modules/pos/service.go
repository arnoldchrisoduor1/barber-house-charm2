package pos

import (
	"context"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type CreateTransactionDTO struct {
	AmountKES     int        `json:"amount_kes"`
	PaymentMethod string     `json:"payment_method"`
	BranchID      *uuid.UUID `json:"branch_id"`
	CustomerID    *uuid.UUID `json:"customer_id"`
	Reference     string     `json:"reference"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID) ([]Transaction, error) {
	return s.repo.List(ctx, orgID)
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
