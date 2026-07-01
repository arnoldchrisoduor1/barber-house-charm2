package analytics

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type PatientIntakeRow struct {
	ID       uuid.UUID `json:"id"`
	FullName string    `json:"full_name"`
	Phone    string    `json:"phone"`
	Notes    string    `json:"notes"`
}

func (r *Repository) PatientIntake(ctx context.Context, orgID uuid.UUID) ([]PatientIntakeRow, error) {
	var rows []PatientIntakeRow
	err := r.db.WithContext(ctx).Table("customers").
		Scopes(platformtenancy.OrgScope(orgID)).
		Select("id, full_name, phone, COALESCE(notes, '') AS notes").
		Order("created_at DESC").
		Limit(100).
		Scan(&rows).Error
	return rows, err
}

type AftercareRow struct {
	ID           uuid.UUID `json:"id"`
	CustomerName string    `json:"customer_name"`
	ServiceName  string    `json:"service_name"`
	Status       string    `json:"status"`
	ScheduledAt  string    `json:"scheduled_at"`
}

func (r *Repository) Aftercare(ctx context.Context, orgID uuid.UUID) ([]AftercareRow, error) {
	var rows []AftercareRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT b.id, COALESCE(c.full_name, '') AS customer_name,
			COALESCE(b.service_name, 'Service') AS service_name,
			b.status, COALESCE(b.scheduled_at::text, '') AS scheduled_at
		FROM bookings b
		LEFT JOIN customers c ON c.id = b.customer_id AND c.organization_id = b.organization_id
		WHERE b.organization_id = ? AND b.status IN ('completed', 'scheduled')
		ORDER BY b.scheduled_at DESC NULLS LAST
		LIMIT 50
	`, orgID).Scan(&rows).Error
	return rows, err
}

type SessionNoteRow struct {
	ID           uuid.UUID `json:"id"`
	CustomerName string    `json:"customer_name"`
	StaffName    string    `json:"staff_name"`
	Note         string    `json:"note"`
	CreatedAt    string    `json:"created_at"`
}

func (r *Repository) SessionNotes(ctx context.Context, orgID uuid.UUID) ([]SessionNoteRow, error) {
	var rows []SessionNoteRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT c.id, c.full_name AS customer_name, '' AS staff_name,
			COALESCE(c.notes, c.style_preferences, '') AS note,
			COALESCE(c.updated_at::text, c.created_at::text, '') AS created_at
		FROM customers c
		WHERE c.organization_id = ? AND (c.notes IS NOT NULL OR c.style_preferences IS NOT NULL)
		ORDER BY c.updated_at DESC NULLS LAST
		LIMIT 50
	`, orgID).Scan(&rows).Error
	return rows, err
}

type ProgressRow struct {
	CustomerID   uuid.UUID `json:"customer_id"`
	CustomerName string    `json:"customer_name"`
	Visits       int64     `json:"visits"`
	LastVisit    string    `json:"last_visit"`
}

func (r *Repository) ProgressTracking(ctx context.Context, orgID uuid.UUID) ([]ProgressRow, error) {
	var rows []ProgressRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT c.id AS customer_id, c.full_name AS customer_name,
			COUNT(b.id) AS visits,
			COALESCE(MAX(b.scheduled_at)::text, '') AS last_visit
		FROM customers c
		LEFT JOIN bookings b ON b.customer_id = c.id AND b.organization_id = c.organization_id
		WHERE c.organization_id = ?
		GROUP BY c.id, c.full_name
		ORDER BY visits DESC
		LIMIT 50
	`, orgID).Scan(&rows).Error
	return rows, err
}

type CoverageZoneRow struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsActive    bool      `json:"is_active"`
}

func (r *Repository) CoverageZones(ctx context.Context, orgID uuid.UUID) ([]CoverageZoneRow, error) {
	if !r.db.Migrator().HasTable("coverage_zones") {
		return []CoverageZoneRow{}, nil
	}
	var rows []CoverageZoneRow
	err := r.db.WithContext(ctx).Table("coverage_zones").
		Scopes(platformtenancy.OrgScope(orgID)).
		Select("id, name, COALESCE(description, '') AS description, is_active").
		Order("name ASC").
		Scan(&rows).Error
	if err == gorm.ErrRecordNotFound {
		return []CoverageZoneRow{}, nil
	}
	return rows, err
}

type FieldOpsRow struct {
	ID          uuid.UUID `json:"id"`
	StaffName   string    `json:"staff_name"`
	Status      string    `json:"status"`
	ScheduledAt string    `json:"scheduled_at"`
	Location    string    `json:"location"`
}

func (r *Repository) FieldOperations(ctx context.Context, orgID uuid.UUID) ([]FieldOpsRow, error) {
	var rows []FieldOpsRow
	err := r.db.WithContext(ctx).Raw(`
		SELECT b.id, COALESCE(s.display_name, '') AS staff_name,
			b.status, COALESCE(b.scheduled_at::text, '') AS scheduled_at,
			COALESCE(b.notes, 'On-site') AS location
		FROM bookings b
		LEFT JOIN staff s ON s.id = b.staff_id AND s.organization_id = b.organization_id
		WHERE b.organization_id = ?
		ORDER BY b.scheduled_at DESC NULLS LAST
		LIMIT 50
	`, orgID).Scan(&rows).Error
	return rows, err
}

func (s *Service) PatientIntake(ctx context.Context, orgID uuid.UUID) ([]PatientIntakeRow, error) {
	return s.repo.PatientIntake(ctx, orgID)
}

func (s *Service) Aftercare(ctx context.Context, orgID uuid.UUID) ([]AftercareRow, error) {
	return s.repo.Aftercare(ctx, orgID)
}

func (s *Service) SessionNotes(ctx context.Context, orgID uuid.UUID) ([]SessionNoteRow, error) {
	return s.repo.SessionNotes(ctx, orgID)
}

func (s *Service) ProgressTracking(ctx context.Context, orgID uuid.UUID) ([]ProgressRow, error) {
	return s.repo.ProgressTracking(ctx, orgID)
}

func (s *Service) CoverageZones(ctx context.Context, orgID uuid.UUID) ([]CoverageZoneRow, error) {
	return s.repo.CoverageZones(ctx, orgID)
}

func (s *Service) FieldOperations(ctx context.Context, orgID uuid.UUID) ([]FieldOpsRow, error) {
	return s.repo.FieldOperations(ctx, orgID)
}
