package analytics

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

type ReportsSummary struct {
	TotalRevenueKES   int64 `json:"total_revenue_kes"`
	TotalBookings     int64 `json:"total_bookings"`
	TotalCustomers    int64 `json:"total_customers"`
	CompletedBookings int64 `json:"completed_bookings"`
}

func (r *Repository) ReportsSummary(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) (*ReportsSummary, error) {
	var out ReportsSummary
	db := r.db.WithContext(ctx)
	branchScope := platformtenancy.OptionalBranchScope(branchID)

	if err := db.Table("transactions").
		Scopes(platformtenancy.OrgScope(orgID), branchScope).
		Where("payment_status = ?", "completed").
		Select("COALESCE(SUM(amount_kes), 0)").
		Scan(&out.TotalRevenueKES).Error; err != nil {
		return nil, err
	}
	if err := db.Table("bookings").
		Scopes(platformtenancy.OrgScope(orgID), branchScope).
		Count(&out.TotalBookings).Error; err != nil {
		return nil, err
	}
	if err := db.Table("bookings").
		Scopes(platformtenancy.OrgScope(orgID), branchScope).
		Where("status = ?", "completed").
		Count(&out.CompletedBookings).Error; err != nil {
		return nil, err
	}
	if err := db.Table("customers").
		Scopes(platformtenancy.OrgScope(orgID), branchScope).
		Count(&out.TotalCustomers).Error; err != nil {
		return nil, err
	}
	return &out, nil
}

type ScorecardRow struct {
	StaffID     uuid.UUID `json:"staff_id"`
	DisplayName string    `json:"display_name"`
	Bookings    int64     `json:"bookings"`
	RevenueKES  int64     `json:"revenue_kes"`
	AvgRating   float64   `json:"avg_rating"`
}

func (r *Repository) Scorecards(ctx context.Context, orgID uuid.UUID) ([]ScorecardRow, error) {
	var rows []ScorecardRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT s.id AS staff_id, s.display_name,
			COUNT(DISTINCT b.id) AS bookings,
			COALESCE(SUM(t.amount_kes), 0) AS revenue_kes,
			COALESCE(AVG(rv.rating), 0) AS avg_rating
		FROM staff s
		LEFT JOIN bookings b ON b.staff_id = s.id AND b.organization_id = s.organization_id
		LEFT JOIN transactions t ON t.organization_id = s.organization_id AND t.payment_status = 'completed'
		LEFT JOIN reviews rv ON rv.staff_id = s.id AND rv.organization_id = s.organization_id
		WHERE s.organization_id = ? AND s.is_active = true
		GROUP BY s.id, s.display_name
		ORDER BY revenue_kes DESC
	`, orgID).Scan(&rows).Error
	return rows, err
}

type RevenueForecastPoint struct {
	Month       string `json:"month"`
	RevenueKES  int64  `json:"revenue_kes"`
	Bookings    int64  `json:"bookings"`
	ProjectedKES int64 `json:"projected_kes"`
}

func (r *Repository) RevenueForecast(ctx context.Context, orgID uuid.UUID) ([]RevenueForecastPoint, error) {
	var rows []RevenueForecastPoint
	err := r.db.WithContext(ctx).Raw(`
		SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
			COALESCE(SUM(amount_kes), 0) AS revenue_kes,
			0 AS bookings,
			COALESCE(SUM(amount_kes), 0) AS projected_kes
		FROM transactions
		WHERE organization_id = ? AND payment_status = 'completed'
		  AND created_at >= now() - interval '6 months'
		GROUP BY 1
		ORDER BY 1
	`, orgID).Scan(&rows).Error
	return rows, err
}

type CallCentreStats struct {
	TotalEnquiries   int64 `json:"total_enquiries"`
	UnreadEnquiries  int64 `json:"unread_enquiries"`
	TotalBookings    int64 `json:"total_bookings"`
	PendingBookings  int64 `json:"pending_bookings"`
}

func (r *Repository) CallCentreStats(ctx context.Context, orgID uuid.UUID) (*CallCentreStats, error) {
	var out CallCentreStats
	db := r.db.WithContext(ctx)
	if err := db.Table("enquiries").Scopes(platformtenancy.OrgScope(orgID)).Count(&out.TotalEnquiries).Error; err != nil {
		return nil, err
	}
	if err := db.Table("enquiries").Scopes(platformtenancy.OrgScope(orgID)).Where("is_read = false").Count(&out.UnreadEnquiries).Error; err != nil {
		return nil, err
	}
	if err := db.Table("bookings").Scopes(platformtenancy.OrgScope(orgID)).Count(&out.TotalBookings).Error; err != nil {
		return nil, err
	}
	if err := db.Table("bookings").Scopes(platformtenancy.OrgScope(orgID)).Where("status IN ?", []string{"scheduled", "confirmed"}).Count(&out.PendingBookings).Error; err != nil {
		return nil, err
	}
	return &out, nil
}

type MyEarningsRow struct {
	StaffID        uuid.UUID `json:"staff_id"`
	DisplayName    string    `json:"display_name"`
	CommissionRate float64   `json:"commission_rate"`
	RevenueKES     int64     `json:"revenue_kes"`
	CommissionKES  int64     `json:"commission_kes"`
	PeriodStart    time.Time `json:"period_start"`
	PeriodEnd      time.Time `json:"period_end"`
}

func (r *Repository) MyEarnings(ctx context.Context, orgID, staffID uuid.UUID) (*MyEarningsRow, error) {
	var row MyEarningsRow
	start := time.Now().AddDate(0, -1, 0)
	end := time.Now()
	err := r.db.WithContext(ctx).Raw(`
		SELECT s.id AS staff_id, s.display_name, s.commission_rate,
			COALESCE(SUM(t.amount_kes), 0) AS revenue_kes,
			COALESCE(SUM(t.amount_kes * s.commission_rate / 100), 0)::bigint AS commission_kes,
			? AS period_start, ? AS period_end
		FROM staff s
		LEFT JOIN transactions t ON t.organization_id = s.organization_id
			AND t.payment_status = 'completed'
			AND t.created_at >= ?
		WHERE s.organization_id = ? AND s.id = ?
		GROUP BY s.id, s.display_name, s.commission_rate
	`, start, end, start, orgID, staffID).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	row.PeriodStart = start
	row.PeriodEnd = end
	return &row, nil
}
