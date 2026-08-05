package ledger

import (
	"context"
	"fmt"
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
	s.recordOrgAudit(ctx, orgID, userID, "expense.create", "expense", &row.ID, map[string]any{
		"amount_kes": row.AmountKES,
		"category":   row.Category,
	})
	return row, nil
}

func (s *Service) UpdateExpense(ctx context.Context, orgID, id uuid.UUID, dto ExpenseDTO, userID *uuid.UUID) (*Expense, error) {
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
	s.recordOrgAudit(ctx, orgID, userID, "expense.update", "expense", &row.ID, map[string]any{
		"amount_kes": row.AmountKES,
		"category":   row.Category,
	})
	return row, nil
}

// UploadExpenseReceipt stores the receipt in object storage and points the expense row at
// the resulting URL — a real upload rather than the URL-only field the audit flagged.
func (s *Service) UploadExpenseReceipt(ctx context.Context, orgID, id uuid.UUID, userID *uuid.UUID, filename string, data []byte, contentType string) (*Expense, error) {
	if s.storage == nil {
		return nil, fmt.Errorf("object storage is not configured")
	}
	row, err := s.repo.GetExpense(ctx, orgID, id)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	url, err := s.storage.UploadObject(ctx, fmt.Sprintf("receipts/%s", orgID), filename, data, contentType)
	if err != nil {
		return nil, fmt.Errorf("upload receipt: %w", err)
	}
	row.ReceiptURL = url
	if err := s.repo.UpdateExpense(ctx, orgID, row); err != nil {
		return nil, err
	}
	s.recordOrgAudit(ctx, orgID, userID, "expense.update", "expense", &row.ID, map[string]any{
		"receipt_uploaded": true,
	})
	return row, nil
}

func (s *Service) DeleteExpense(ctx context.Context, orgID, id uuid.UUID, userID *uuid.UUID) error {
	if err := s.repo.DeleteExpense(ctx, orgID, id); err != nil {
		return err
	}
	eid := id
	s.recordOrgAudit(ctx, orgID, userID, "expense.delete", "expense", &eid, map[string]any{})
	return nil
}
