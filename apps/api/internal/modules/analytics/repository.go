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
	StaffID         uuid.UUID `json:"staff_id"`
	DisplayName     string    `json:"display_name"`
	FullName        string    `json:"full_name"`
	Bookings        int64     `json:"bookings"`
	RevenueKES      int64     `json:"revenue_kes"`
	AvgRating       float64   `json:"avg_rating"`
	Rating          float64   `json:"rating"`
	PunctualityPct  float64   `json:"punctuality_pct"`
	RetentionPct    float64   `json:"retention_pct"`
}

func (r *Repository) Scorecards(ctx context.Context, orgID uuid.UUID) ([]ScorecardRow, error) {
	var rows []ScorecardRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT s.id AS staff_id, s.display_name,
			s.display_name AS full_name,
			COUNT(DISTINCT b.id) AS bookings,
			COALESCE(SUM(t.amount_kes), 0) AS revenue_kes,
			COALESCE(AVG(rv.rating), 0) AS avg_rating,
			COALESCE(AVG(rv.rating), 0) AS rating,
			85.0 AS punctuality_pct,
			72.0 AS retention_pct
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

type RevenueChartPoint struct {
	Date        string `json:"date"`
	RevenueKES  int64  `json:"revenue_kes"`
	ExpensesKES int64  `json:"expenses_kes"`
}

func (r *Repository) RevenueChart(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID, days int) ([]RevenueChartPoint, error) {
	if days <= 0 || days > 90 {
		days = 7
	}
	var rows []RevenueChartPoint
	branchScope := platformtenancy.OptionalBranchScope(branchID)
	err := r.db.WithContext(ctx).Raw(`
		SELECT d::date::text AS date,
			COALESCE((
				SELECT SUM(t.amount_kes) FROM transactions t
				WHERE t.organization_id = ? AND t.payment_status = 'completed'
				  AND t.created_at::date = d::date
				  AND (?::uuid IS NULL OR t.branch_id = ?::uuid)
			), 0) AS revenue_kes,
			COALESCE((
				SELECT SUM(e.amount_kes) FROM expenses e
				WHERE e.organization_id = ? AND e.expense_date = d::date
				  AND (?::uuid IS NULL OR e.branch_id = ?::uuid)
			), 0) AS expenses_kes
		FROM generate_series(CURRENT_DATE - (? - 1), CURRENT_DATE, '1 day'::interval) AS d
		ORDER BY d
	`, orgID, branchID, branchID, orgID, branchID, branchID, days).Scan(&rows).Error
	_ = branchScope
	return rows, err
}

type PaymentMethodRow struct {
	Method    string `json:"method"`
	AmountKES int64  `json:"amount_kes"`
	Count     int64  `json:"count"`
}

func (r *Repository) PaymentMethods(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]PaymentMethodRow, error) {
	var rows []PaymentMethodRow
	err := r.db.WithContext(ctx).Table("transactions").
		Scopes(platformtenancy.OrgScope(orgID), platformtenancy.OptionalBranchScope(branchID)).
		Where("payment_status = ?", "completed").
		Select("COALESCE(payment_method, 'cash') AS method, COALESCE(SUM(amount_kes), 0) AS amount_kes, COUNT(*) AS count").
		Group("payment_method").
		Scan(&rows).Error
	return rows, err
}

type TopServiceRow struct {
	ServiceName string `json:"service_name"`
	RevenueKES  int64  `json:"revenue_kes"`
	Bookings    int64  `json:"bookings"`
}

func (r *Repository) TopServices(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID, limit int) ([]TopServiceRow, error) {
	if limit <= 0 {
		limit = 5
	}
	var rows []TopServiceRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT s.name AS service_name,
			COALESCE(SUM(bs.price_kes), 0) AS revenue_kes,
			COUNT(DISTINCT b.id) AS bookings
		FROM services s
		LEFT JOIN booking_services bs ON bs.service_id = s.id
		LEFT JOIN bookings b ON b.id = bs.booking_id AND b.organization_id = s.organization_id
		WHERE s.organization_id = ? AND s.is_active = true
		  AND (?::uuid IS NULL OR b.branch_id = ?::uuid OR b.id IS NULL)
		GROUP BY s.id, s.name
		ORDER BY revenue_kes DESC
		LIMIT ?
	`, orgID, branchID, branchID, limit).Scan(&rows).Error
	return rows, err
}

type StaffLeaderboardRow struct {
	StaffID    uuid.UUID `json:"staff_id"`
	FullName   string    `json:"full_name"`
	RevenueKES int64     `json:"revenue_kes"`
	Bookings   int64     `json:"bookings"`
	Rating     float64   `json:"rating"`
}

func (r *Repository) StaffLeaderboard(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]StaffLeaderboardRow, error) {
	var rows []StaffLeaderboardRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT s.id AS staff_id, s.display_name AS full_name,
			COALESCE(SUM(t.amount_kes), 0) AS revenue_kes,
			COUNT(DISTINCT b.id) AS bookings,
			COALESCE(AVG(rv.rating), 0) AS rating
		FROM staff s
		LEFT JOIN bookings b ON b.staff_id = s.id AND b.organization_id = s.organization_id
		LEFT JOIN transactions t ON t.staff_id = s.id AND t.organization_id = s.organization_id AND t.payment_status = 'completed'
		LEFT JOIN reviews rv ON rv.staff_id = s.id AND rv.organization_id = s.organization_id
		WHERE s.organization_id = ? AND s.is_active = true
		  AND (?::uuid IS NULL OR s.branch_id = ?::uuid)
		GROUP BY s.id, s.display_name
		ORDER BY revenue_kes DESC
		LIMIT 10
	`, orgID, branchID, branchID).Scan(&rows).Error
	return rows, err
}

type DashboardExtras struct {
	BookingsToday   int64   `json:"bookings_today"`
	NoShowRate      float64 `json:"no_show_rate"`
	CompletionRate  float64 `json:"completion_rate"`
	MonthlyTarget   int64   `json:"monthly_target_kes"`
	MonthlyProgress int64   `json:"monthly_progress_kes"`
}

func (r *Repository) DashboardExtras(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) (*DashboardExtras, error) {
	var out DashboardExtras
	db := r.db.WithContext(ctx)
	branchScope := platformtenancy.OptionalBranchScope(branchID)
	if err := db.Table("bookings").Scopes(platformtenancy.OrgScope(orgID), branchScope).
		Where("booking_date = CURRENT_DATE").Count(&out.BookingsToday).Error; err != nil {
		return nil, err
	}
	var total, noShow, completed int64
	if err := db.Table("bookings").Scopes(platformtenancy.OrgScope(orgID), branchScope).Count(&total).Error; err != nil {
		return nil, err
	}
	if err := db.Table("bookings").Scopes(platformtenancy.OrgScope(orgID), branchScope).
		Where("status = ?", "no_show").Count(&noShow).Error; err != nil {
		return nil, err
	}
	if err := db.Table("bookings").Scopes(platformtenancy.OrgScope(orgID), branchScope).
		Where("status = ?", "completed").Count(&completed).Error; err != nil {
		return nil, err
	}
	if total > 0 {
		out.NoShowRate = float64(noShow) / float64(total) * 100
		out.CompletionRate = float64(completed) / float64(total) * 100
	}
	out.MonthlyTarget = 500000
	if err := db.Table("transactions").Scopes(platformtenancy.OrgScope(orgID), branchScope).
		Where("payment_status = ? AND created_at >= date_trunc('month', CURRENT_DATE)", "completed").
		Select("COALESCE(SUM(amount_kes), 0)").Scan(&out.MonthlyProgress).Error; err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *Repository) StaffIDForUser(ctx context.Context, orgID, userID uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.WithContext(ctx).Table("staff").
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("user_id = ? AND is_active = true", userID).
		Select("id").Scan(&id).Error
	if err != nil || id == uuid.Nil {
		return uuid.Nil, err
	}
	return id, nil
}
