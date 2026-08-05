package reconciliation

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Run, error) {
	var rows []Run
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID), platformtenancy.OptionalBranchScope(branchID))
	err := q.Order("run_date DESC").Limit(60).Find(&rows).Error
	return rows, err
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Run, error) {
	var row Run
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) FindOpenForDate(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID, date time.Time) (*Run, error) {
	var row Run
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("run_date = ?", date.Format("2006-01-02"))
	if branchID != nil {
		q = q.Where("branch_id = ?", *branchID)
	} else {
		q = q.Where("branch_id IS NULL")
	}
	err := q.First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &row, err
}

func (r *Repository) Create(ctx context.Context, row *Run) error {
	return r.db.WithContext(ctx).Create(row).Error
}

// ExpectedTotals sums today's completed POS collections split cash vs card/mobile — the
// authoritative "what the till should hold" figure the operator's count is checked against.
func (r *Repository) ExpectedTotals(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID, date time.Time) (cashKES, cardKES int64, err error) {
	type result struct {
		CashKES int64
		CardKES int64
	}
	var res result
	q := r.db.WithContext(ctx).Table("transactions").
		Scopes(platformtenancy.OrgScope(orgID), platformtenancy.OptionalBranchScope(branchID)).
		Where("payment_status = ? AND created_at::date = ?", "completed", date.Format("2006-01-02"))
	err = q.Select(`
		COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount_kes ELSE 0 END), 0) AS cash_kes,
		COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN amount_kes ELSE 0 END), 0) AS card_kes
	`).Scan(&res).Error
	return res.CashKES, res.CardKES, err
}

func (r *Repository) Save(ctx context.Context, orgID uuid.UUID, row *Run) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}
