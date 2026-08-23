package analytics

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type CoverageZoneRow struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	City         string    `json:"city"`
	RadiusKm     float64   `json:"radius_km"`
	SurchargeKES int       `json:"surcharge_kes"`
	IsActive     bool      `json:"is_active"`
}

func (r *Repository) CoverageZones(ctx context.Context, orgID uuid.UUID) ([]CoverageZoneRow, error) {
	if !r.db.Migrator().HasTable("coverage_zones") {
		return []CoverageZoneRow{}, nil
	}
	var rows []CoverageZoneRow
	err := r.db.WithContext(ctx).Table("coverage_zones").
		Scopes(platformtenancy.OrgScope(orgID)).
		Select(`id, name, COALESCE(city, '') AS city,
			COALESCE(radius_km, 0) AS radius_km,
			COALESCE(surcharge_kes, 0) AS surcharge_kes,
			is_active`).
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

func (s *Service) CoverageZones(ctx context.Context, orgID uuid.UUID) ([]CoverageZoneRow, error) {
	return s.repo.CoverageZones(ctx, orgID)
}

func (s *Service) FieldOperations(ctx context.Context, orgID uuid.UUID) ([]FieldOpsRow, error) {
	return s.repo.FieldOperations(ctx, orgID)
}
