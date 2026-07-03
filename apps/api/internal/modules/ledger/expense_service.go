package ledger

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type ExpenseDTO struct {
	BranchID    *uuid.UUID `json:"branch_id"`
	AmountKES   int64      `json:"amount_kes"`
	Category    string     `json:"category"`
	Description string     `json:"description"`
	ReceiptURL  string     `json:"receipt_url"`
	ExpenseDate string     `json:"expense_date"`
}

func (s *Service) ListExpenses(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Expense, error) {
	return s.repo.ListExpenses(ctx, orgID, branchID)
}

func (s *Service) CreateExpense(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, dto ExpenseDTO) (*Expense, error) {
	date, err := time.Parse("2006-01-02", dto.ExpenseDate)
	if err != nil {
		date = time.Now()
	}
	row := &Expense{
		OrganizationID:  orgID,
		BranchID:        dto.BranchID,
		AmountKES:       dto.AmountKES,
		Category:        dto.Category,
		Description:     dto.Description,
		ReceiptURL:      dto.ReceiptURL,
		ExpenseDate:     date,
		CreatedByUserID: userID,
	}
	if row.Category == "" {
		row.Category = "general"
	}
	if err := s.repo.CreateExpense(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateExpense(ctx context.Context, orgID, id uuid.UUID, dto ExpenseDTO) (*Expense, error) {
	row, err := s.repo.GetExpense(ctx, orgID, id)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	if dto.ExpenseDate != "" {
		if d, err := time.Parse("2006-01-02", dto.ExpenseDate); err == nil {
			row.ExpenseDate = d
		}
	}
	row.AmountKES = dto.AmountKES
	row.Category = dto.Category
	row.Description = dto.Description
	row.ReceiptURL = dto.ReceiptURL
	row.BranchID = dto.BranchID
	if err := s.repo.UpdateExpense(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteExpense(ctx context.Context, orgID, id uuid.UUID) error {
	return s.repo.DeleteExpense(ctx, orgID, id)
}
