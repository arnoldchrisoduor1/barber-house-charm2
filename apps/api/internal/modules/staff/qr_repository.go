package staff

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (r *Repository) CreateQRScan(ctx context.Context, row *QRScan) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) ListQRScans(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID, date string) ([]QRScan, error) {
	var rows []QRScan
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("scanned_at DESC")
	if staffID != nil {
		q = q.Where("staff_id = ?", *staffID)
	}
	if date != "" {
		q = q.Where("scanned_at::date = ?", date)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *Repository) AttendanceSummary(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID, date string) ([]struct {
	StaffID     uuid.UUID
	DisplayName string
	ClockIn     *time.Time
	ClockOut    *time.Time
}, error) {
	var rows []struct {
		StaffID     uuid.UUID
		DisplayName string
		ClockIn     *time.Time
		ClockOut    *time.Time
	}
	d := date
	if d == "" {
		d = time.Now().Format("2006-01-02")
	}
	q := `
		SELECT s.id AS staff_id, s.display_name,
			(SELECT scanned_at FROM qr_scans q WHERE q.staff_id = s.id AND q.organization_id = s.organization_id
			 AND q.scan_type = 'clock_in' AND q.scanned_at::date = ?::date ORDER BY scanned_at ASC LIMIT 1) AS clock_in,
			(SELECT scanned_at FROM qr_scans q WHERE q.staff_id = s.id AND q.organization_id = s.organization_id
			 AND q.scan_type = 'clock_out' AND q.scanned_at::date = ?::date ORDER BY scanned_at DESC LIMIT 1) AS clock_out
		FROM staff s WHERE s.organization_id = ? AND s.is_active = true
	`
	args := []any{d, d, orgID}
	if branchID != nil {
		q += " AND (s.branch_id IS NULL OR s.branch_id = ?)"
		args = append(args, *branchID)
	}
	err := r.db.WithContext(ctx).Raw(q, args...).Scan(&rows).Error
	return rows, err
}

func (r *Repository) StaffAttendanceDay(ctx context.Context, orgID, staffID uuid.UUID, date string) (*time.Time, *time.Time, error) {
	d := date
	if d == "" {
		d = time.Now().Format("2006-01-02")
	}
	var row struct {
		ClockIn  *time.Time
		ClockOut *time.Time
	}
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			(SELECT scanned_at FROM qr_scans q WHERE q.staff_id = ? AND q.organization_id = ?
			 AND q.scan_type = 'clock_in' AND q.scanned_at::date = ?::date ORDER BY scanned_at ASC LIMIT 1) AS clock_in,
			(SELECT scanned_at FROM qr_scans q WHERE q.staff_id = ? AND q.organization_id = ?
			 AND q.scan_type = 'clock_out' AND q.scanned_at::date = ?::date ORDER BY scanned_at DESC LIMIT 1) AS clock_out
	`, staffID, orgID, d, staffID, orgID, d).Scan(&row).Error
	if err != nil {
		return nil, nil, err
	}
	return row.ClockIn, row.ClockOut, nil
}

func (r *Repository) FindStaffByUser(ctx context.Context, orgID, userID uuid.UUID) (*Staff, error) {
	var row Staff
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("user_id = ? AND is_active = true", userID).First(&row).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &row, err
}
