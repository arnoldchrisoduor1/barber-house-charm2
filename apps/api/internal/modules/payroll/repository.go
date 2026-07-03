package payroll

import (
	"context"
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

func (r *Repository) ListRules(ctx context.Context, orgID uuid.UUID) ([]CommissionRule, error) {
	var rows []CommissionRule
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Find(&rows).Error
	return rows, err
}

func (r *Repository) CreateRule(ctx context.Context, row *CommissionRule) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateRule(ctx context.Context, orgID uuid.UUID, row *CommissionRule) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) DeleteRule(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&CommissionRule{}, "id = ?", id).Error
}

type CommissionSummaryRow struct {
	StaffID       uuid.UUID `json:"staff_id"`
	DisplayName   string    `json:"display_name"`
	RevenueKES    int64     `json:"revenue_kes"`
	CommissionKES int64     `json:"commission_kes"`
	OwnerShareKES int64     `json:"owner_share_kes"`
}

func (r *Repository) CommissionSummary(ctx context.Context, orgID uuid.UUID, start, end time.Time) ([]CommissionSummaryRow, error) {
	var rows []CommissionSummaryRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT s.id AS staff_id, s.display_name,
			COALESCE(SUM(t.amount_kes), 0) AS revenue_kes,
			COALESCE(SUM(t.amount_kes * s.commission_rate / 100), 0)::bigint AS commission_kes,
			COALESCE(SUM(t.amount_kes * (100 - s.commission_rate) / 100), 0)::bigint AS owner_share_kes
		FROM staff s
		LEFT JOIN transactions t ON t.staff_id = s.id AND t.organization_id = s.organization_id
			AND t.payment_status = 'completed' AND t.created_at >= ? AND t.created_at <= ?
		WHERE s.organization_id = ? AND s.is_active = true
		GROUP BY s.id, s.display_name
		ORDER BY revenue_kes DESC
	`, start, end, orgID).Scan(&rows).Error
	return rows, err
}

func (r *Repository) ListPayslips(ctx context.Context, orgID uuid.UUID) ([]Payslip, error) {
	var rows []Payslip
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("period_end DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) CreatePayslip(ctx context.Context, row *Payslip) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) GetPayslip(ctx context.Context, orgID, id uuid.UUID) (*Payslip, error) {
	var row Payslip
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}
