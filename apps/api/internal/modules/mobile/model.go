package mobile

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type CoverageZone struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index" json:"organization_id"`
	Name           string    `gorm:"not null" json:"name"`
	City           string    `gorm:"not null;default:''" json:"city"`
	RadiusKm       float64   `gorm:"not null;default:0" json:"radius_km"`
	SurchargeKES   int       `gorm:"not null;default:0" json:"surcharge_kes"`
	IsActive       bool      `gorm:"not null;default:true" json:"is_active"`
}

func (CoverageZone) TableName() string { return "coverage_zones" }
func (CoverageZone) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*CoverageZone)(nil)

type FieldJob struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index" json:"organization_id"`
	BookingID      *uuid.UUID `gorm:"type:uuid;index" json:"booking_id,omitempty"`
	StaffID        *uuid.UUID `gorm:"type:uuid;index" json:"staff_id,omitempty"`
	CoverageZoneID *uuid.UUID `gorm:"type:uuid" json:"coverage_zone_id,omitempty"`
	Status         string     `gorm:"not null;default:assigned" json:"status"`
	VisitAddress   string     `gorm:"not null;default:''" json:"visit_address"`
	Notes          string     `gorm:"not null;default:''" json:"notes"`
	ScheduledAt    *time.Time `json:"scheduled_at,omitempty"`
	StartedAt      *time.Time `json:"started_at,omitempty"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
}

func (FieldJob) TableName() string { return "field_jobs" }
func (FieldJob) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*FieldJob)(nil)
