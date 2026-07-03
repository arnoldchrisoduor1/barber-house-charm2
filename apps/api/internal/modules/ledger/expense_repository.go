package ledger

import (
	"context"
	"time"

	"github.com/google/uuid"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (r *Repository) ListExpenses(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Expense, error) {
	var rows []Expense
	err := r.db.WithContext(ctx).
		Scopes(platformtenancy.OrgScope(orgID), platformtenancy.OptionalBranchScope(branchID)).
		Order("expense_date DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) CreateExpense(ctx context.Context, row *Expense) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateExpense(ctx context.Context, orgID uuid.UUID, row *Expense) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) DeleteExpense(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&Expense{}, "id = ?", id).Error
}

func (r *Repository) GetExpense(ctx context.Context, orgID, id uuid.UUID) (*Expense, error) {
	var row Expense
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) ExpensesByCategory(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]struct {
	Category  string
	AmountKES int64
}, error) {
	var rows []struct {
		Category  string
		AmountKES int64
	}
	err := r.db.WithContext(ctx).Table("expenses").
		Scopes(platformtenancy.OrgScope(orgID), platformtenancy.OptionalBranchScope(branchID)).
		Select("category, COALESCE(SUM(amount_kes), 0) AS amount_kes").
		Group("category").Scan(&rows).Error
	return rows, err
}

func (r *Repository) ExpensesSince(ctx context.Context, orgID uuid.UUID, since time.Time, branchID *uuid.UUID) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).Table("expenses").
		Scopes(platformtenancy.OrgScope(orgID), platformtenancy.OptionalBranchScope(branchID)).
		Where("expense_date >= ?", since).
		Select("COALESCE(SUM(amount_kes), 0)").Scan(&total).Error
	return total, err
}
