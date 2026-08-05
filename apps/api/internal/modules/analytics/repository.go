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
			COALESCE(punct.punctuality_pct, 0) AS punctuality_pct,
			COALESCE(ret.retention_pct, 0) AS retention_pct
		FROM staff s
		LEFT JOIN bookings b ON b.staff_id = s.id AND b.organization_id = s.organization_id
		LEFT JOIN transactions t ON t.organization_id = s.organization_id AND t.payment_status = 'completed'
		LEFT JOIN reviews rv ON rv.staff_id = s.id AND rv.organization_id = s.organization_id
		LEFT JOIN LATERAL (
			SELECT CASE WHEN COUNT(*) = 0 THEN 0
				ELSE 100.0 * SUM(CASE WHEN qs.scanned_at::time <= ss.start_time + interval '15 minutes' THEN 1 ELSE 0 END) / COUNT(*)
			END AS punctuality_pct
			FROM qr_scans qs
			INNER JOIN staff_schedules ss ON ss.staff_id = qs.staff_id AND ss.organization_id = qs.organization_id
				AND ss.schedule_date = qs.scanned_at::date AND ss.is_day_off = false
			WHERE qs.staff_id = s.id AND qs.organization_id = s.organization_id AND qs.scan_type = 'clock_in'
				AND qs.scanned_at >= now() - interval '30 days'
		) punct ON true
		LEFT JOIN LATERAL (
			SELECT CASE WHEN COUNT(DISTINCT b2.customer_id) = 0 THEN 0
				ELSE 100.0 * COUNT(DISTINCT b2.customer_id) FILTER (
					WHERE b2.customer_id IN (
						SELECT customer_id FROM bookings bx
						WHERE bx.staff_id = s.id AND bx.organization_id = s.organization_id AND bx.status = 'completed'
						GROUP BY customer_id HAVING COUNT(*) >= 2
					)
				) / COUNT(DISTINCT b2.customer_id)
			END AS retention_pct
			FROM bookings b2
			WHERE b2.staff_id = s.id AND b2.organization_id = s.organization_id AND b2.status = 'completed'
				AND b2.booking_date >= CURRENT_DATE - interval '90 days'
		) ret ON true
		WHERE s.organization_id = ? AND s.is_active = true
		GROUP BY s.id, s.display_name, punct.punctuality_pct, ret.retention_pct
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
		WITH months AS (
			SELECT generate_series(
				date_trunc('month', now()) - interval '5 months',
				date_trunc('month', now()),
				interval '1 month'
			)::date AS month_start
		),
		revenue AS (
			SELECT date_trunc('month', created_at)::date AS month_start,
				COALESCE(SUM(amount_kes), 0) AS revenue_kes
			FROM transactions
			WHERE organization_id = ? AND payment_status = 'completed'
			  AND created_at >= date_trunc('month', now()) - interval '5 months'
			GROUP BY 1
		),
		booking_counts AS (
			SELECT date_trunc('month', booking_date)::date AS month_start,
				COUNT(*) AS bookings
			FROM bookings
			WHERE organization_id = ? AND status NOT IN ('cancelled', 'no_show')
			  AND booking_date >= date_trunc('month', now()) - interval '5 months'
			GROUP BY 1
		),
		trailing AS (
			SELECT COALESCE(AVG(revenue_kes), 0)::bigint AS avg_kes
			FROM revenue
			WHERE month_start >= date_trunc('month', now()) - interval '3 months'
			  AND month_start < date_trunc('month', now())
		)
		SELECT to_char(m.month_start, 'YYYY-MM') AS month,
			COALESCE(r.revenue_kes, 0) AS revenue_kes,
			COALESCE(b.bookings, 0) AS bookings,
			CASE
				WHEN m.month_start >= date_trunc('month', now())::date THEN (SELECT avg_kes FROM trailing)
				ELSE COALESCE(r.revenue_kes, 0)
			END AS projected_kes
		FROM months m
		LEFT JOIN revenue r ON r.month_start = m.month_start
		LEFT JOIN booking_counts b ON b.month_start = m.month_start
		ORDER BY m.month_start
	`, orgID, orgID).Scan(&rows).Error
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
	TipsKES        int64     `json:"tips_kes"`
	PeriodStart    time.Time `json:"period_start"`
	PeriodEnd      time.Time `json:"period_end"`
}

// MyEarnings is scoped to sales THIS staff member actually rang up (transactions.staff_id)
// and commission lines written for them — a staff-wide LEFT JOIN with no staff filter used
// to show every barber the whole org's revenue. Commission comes from immutable
// commission_lines (see B2-03), not a live rate recompute, so it matches what payroll pays.
func (r *Repository) MyEarnings(ctx context.Context, orgID, staffID uuid.UUID) (*MyEarningsRow, error) {
	var row MyEarningsRow
	start := time.Now().AddDate(0, -1, 0)
	end := time.Now()
	err := r.db.WithContext(ctx).Raw(`
		SELECT s.id AS staff_id, s.display_name, s.commission_rate,
			COALESCE((
				SELECT SUM(t.amount_kes) FROM transactions t
				WHERE t.organization_id = s.organization_id AND t.staff_id = s.id
				  AND t.payment_status = 'completed' AND t.created_at >= ? AND t.created_at <= ?
			), 0) AS revenue_kes,
			COALESCE((
				SELECT SUM(cl.amount_kes) FROM commission_lines cl
				WHERE cl.organization_id = s.organization_id AND cl.staff_id = s.id
				  AND cl.created_at >= ? AND cl.created_at <= ?
			), 0) AS commission_kes,
			COALESCE((
				SELECT SUM(tp.amount_kes) FROM tips tp
				WHERE tp.organization_id = s.organization_id AND tp.staff_id = s.id
				  AND tp.tip_date >= ?::date AND tp.tip_date <= ?::date
			), 0) AS tips_kes,
			? AS period_start, ? AS period_end
		FROM staff s
		WHERE s.organization_id = ? AND s.id = ?
	`, start, end, start, end, start, end, start, end, orgID, staffID).Scan(&row).Error
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

type PnLPoint struct {
	Month         string `json:"month"`
	RevenueKES    int64  `json:"revenue_kes"`
	ExpensesKES   int64  `json:"expenses_kes"`
	CommissionKES int64  `json:"commission_kes"`
	NetKES        int64  `json:"net_kes"`
}

// PnL computes revenue - expenses - commissions per month straight from the ledger — no
// hardcoded months, whatever the org actually has activity for in the window.
func (r *Repository) PnL(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID, months int) ([]PnLPoint, error) {
	if months <= 0 || months > 24 {
		months = 6
	}
	var rows []PnLPoint
	err := r.db.WithContext(ctx).Raw(`
		SELECT to_char(m, 'YYYY-MM') AS month,
			COALESCE((
				SELECT SUM(t.amount_kes) FROM transactions t
				WHERE t.organization_id = ? AND t.payment_status = 'completed'
				  AND date_trunc('month', t.created_at) = m
				  AND (?::uuid IS NULL OR t.branch_id = ?::uuid)
			), 0) AS revenue_kes,
			COALESCE((
				SELECT SUM(e.amount_kes) FROM expenses e
				WHERE e.organization_id = ? AND date_trunc('month', e.expense_date) = m
				  AND (?::uuid IS NULL OR e.branch_id = ?::uuid)
			), 0) AS expenses_kes,
			COALESCE((
				SELECT SUM(cl.amount_kes) FROM commission_lines cl
				WHERE cl.organization_id = ? AND date_trunc('month', cl.created_at) = m
			), 0) AS commission_kes
		FROM generate_series(date_trunc('month', now()) - (? || ' months')::interval, date_trunc('month', now()), '1 month'::interval) AS m
		ORDER BY m
	`, orgID, branchID, branchID, orgID, branchID, branchID, orgID, months-1).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for i := range rows {
		rows[i].NetKES = rows[i].RevenueKES - rows[i].ExpensesKES - rows[i].CommissionKES
	}
	return rows, nil
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
	MonthlyTarget        int64   `json:"monthly_target_kes"`
	MonthlyProgress      int64   `json:"monthly_progress_kes"`
	ChairUtilizationPct  float64 `json:"chair_utilization_pct"`
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
	var orgRow struct {
		MonthlyRevenueTargetKES int64
		ChairCount              int
	}
	if err := db.Table("organizations").Where("id = ?", orgID).
		Select("monthly_revenue_target_kes, chair_count").Scan(&orgRow).Error; err != nil {
		return nil, err
	}
	out.MonthlyTarget = orgRow.MonthlyRevenueTargetKES
	if out.MonthlyTarget <= 0 {
		out.MonthlyTarget = 500000
	}
	chairs := orgRow.ChairCount
	if chairs <= 0 {
		var activeStaff int64
		_ = db.Table("staff").Scopes(platformtenancy.OrgScope(orgID)).Where("is_active = true").Count(&activeStaff).Error
		chairs = int(activeStaff)
	}
	if chairs > 0 {
		var bookedMinutes float64
		_ = db.Raw(`
			SELECT COALESCE(SUM(GREATEST(EXTRACT(EPOCH FROM (end_time - start_time)) / 60, 0)), 0)
			FROM bookings
			WHERE organization_id = ? AND booking_date = CURRENT_DATE
			  AND status NOT IN ('cancelled', 'no_show')
		`, orgID).Scan(&bookedMinutes).Error
		openMinutes := float64(chairs) * 600.0
		if openMinutes > 0 {
			out.ChairUtilizationPct = bookedMinutes / openMinutes * 100
			if out.ChairUtilizationPct > 100 {
				out.ChairUtilizationPct = 100
			}
		}
	}
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
