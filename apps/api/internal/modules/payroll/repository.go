package payroll

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

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

// CreateCommissionLine is idempotent per transaction: the DB has a partial unique index on
// (transaction_id) WHERE kind='service', so a double-completion (retry, duplicate webhook)
// silently no-ops instead of double-crediting the barber.
func (r *Repository) CreateCommissionLine(ctx context.Context, row *CommissionLine) (created bool, err error) {
	result := r.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(row)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *Repository) GetCommissionLine(ctx context.Context, orgID, id uuid.UUID) (*CommissionLine, error) {
	var row CommissionLine
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) ListCommissionLines(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID, start, end time.Time) ([]CommissionLine, error) {
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("created_at >= ? AND created_at <= ?", start, end)
	if staffID != nil {
		q = q.Where("staff_id = ?", *staffID)
	}
	var rows []CommissionLine
	err := q.Order("created_at DESC").Find(&rows).Error
	return rows, err
}

type CommissionLineSummaryRow struct {
	StaffID       uuid.UUID `json:"staff_id"`
	DisplayName   string    `json:"display_name"`
	RevenueKES    int64     `json:"revenue_kes"`
	CommissionKES int64     `json:"commission_kes"`
	OwnerShareKES int64     `json:"owner_share_kes"`
}

// ResolveCommissionRate prefers a service-specific rule, then a staff-wide rule, then the
// staff record's default commission_rate.
func (r *Repository) ResolveCommissionRate(ctx context.Context, orgID, staffID uuid.UUID, serviceID *uuid.UUID) (float64, error) {
	var rate float64
	err := r.db.WithContext(ctx).Raw(`
		SELECT COALESCE(
			(SELECT rate_pct FROM commission_rules WHERE organization_id = ? AND staff_id = ? AND service_id = ? LIMIT 1),
			(SELECT rate_pct FROM commission_rules WHERE organization_id = ? AND staff_id = ? AND service_id IS NULL LIMIT 1),
			(SELECT commission_rate FROM staff WHERE organization_id = ? AND id = ?),
			0
		)
	`, orgID, staffID, serviceID, orgID, staffID, orgID, staffID).Scan(&rate).Error
	return rate, err
}

// CommissionLineSummary sums immutable lines per staff for the period — the source of
// truth for commission payouts, not a live recompute off transactions.
func (r *Repository) CommissionLineSummary(ctx context.Context, orgID uuid.UUID, start, end time.Time) ([]CommissionLineSummaryRow, error) {
	var rows []CommissionLineSummaryRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT s.id AS staff_id, s.display_name,
			COALESCE(SUM(cl.base_kes), 0) AS revenue_kes,
			COALESCE(SUM(cl.amount_kes), 0) AS commission_kes,
			COALESCE(SUM(cl.base_kes - cl.amount_kes), 0) AS owner_share_kes
		FROM staff s
		LEFT JOIN commission_lines cl ON cl.staff_id = s.id AND cl.organization_id = s.organization_id
			AND cl.created_at >= ? AND cl.created_at <= ?
		WHERE s.organization_id = ? AND s.is_active = true
		GROUP BY s.id, s.display_name
		ORDER BY revenue_kes DESC
	`, start, end, orgID).Scan(&rows).Error
	return rows, err
}

func (r *Repository) CountAttendanceDays(ctx context.Context, orgID, staffID uuid.UUID, start, end time.Time) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Raw(`
		SELECT COUNT(DISTINCT scanned_at::date) FROM qr_scans
		WHERE organization_id = ? AND staff_id = ? AND scan_type = 'clock_in'
		  AND scanned_at::date >= ?::date AND scanned_at::date <= ?::date
	`, orgID, staffID, start.Format("2006-01-02"), end.Format("2006-01-02")).Scan(&count).Error
	return int(count), err
}

func (r *Repository) SumCommissionForStaff(ctx context.Context, orgID, staffID uuid.UUID, start, end time.Time) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).Model(&CommissionLine{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("staff_id = ? AND created_at >= ? AND created_at <= ?", staffID, start, end).
		Select("COALESCE(SUM(amount_kes), 0)").Scan(&total).Error
	return total, err
}
