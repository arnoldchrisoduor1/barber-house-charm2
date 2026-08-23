package therapy

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type SessionNote struct {
	database.Base
	OrganizationID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"organization_id"`
	CustomerID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"customer_id"`
	StaffID           *uuid.UUID `gorm:"type:uuid" json:"staff_id,omitempty"`
	BookingID         *uuid.UUID `gorm:"type:uuid" json:"booking_id,omitempty"`
	SessionDate       time.Time  `gorm:"type:date;not null" json:"session_date"`
	Title             string     `gorm:"not null;default:''" json:"title"`
	Content           string     `gorm:"not null;default:''" json:"content"`
	FocusArea         string     `gorm:"not null;default:''" json:"focus_area"`
	PressureLevel     string     `gorm:"not null;default:''" json:"pressure_level"`
	OilsUsed          string     `gorm:"not null;default:''" json:"oils_used"`
	Contraindications string     `gorm:"not null;default:''" json:"contraindications"`
	NextVisitNotes    string     `gorm:"not null;default:''" json:"next_visit_notes"`
}

func (SessionNote) TableName() string { return "session_notes" }
func (SessionNote) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*SessionNote)(nil)

type ProgressMetric struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index" json:"organization_id"`
	CustomerID     uuid.UUID `gorm:"type:uuid;not null;index" json:"customer_id"`
	MetricName     string    `gorm:"not null" json:"metric_name"`
	MetricValue    string    `gorm:"not null;default:''" json:"metric_value"`
	Notes          string    `gorm:"not null;default:''" json:"notes"`
	RecordedAt     time.Time `gorm:"type:date;not null" json:"recorded_at"`
}

func (ProgressMetric) TableName() string { return "progress_tracking" }
func (ProgressMetric) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*ProgressMetric)(nil)
