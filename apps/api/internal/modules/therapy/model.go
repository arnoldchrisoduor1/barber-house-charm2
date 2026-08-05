package therapy

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type SessionNote struct {
	database.Base
	OrganizationID    uuid.UUID  `gorm:"type:uuid;not null;index"`
	CustomerID        uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID           *uuid.UUID `gorm:"type:uuid"`
	BookingID         *uuid.UUID `gorm:"type:uuid"`
	SessionDate       time.Time  `gorm:"type:date;not null"`
	Title             string     `gorm:"not null;default:''"`
	Content           string     `gorm:"not null;default:''"`
	FocusArea         string     `gorm:"not null;default:''"`
	PressureLevel     string     `gorm:"not null;default:''"`
	OilsUsed          string     `gorm:"not null;default:''"`
	Contraindications string     `gorm:"not null;default:''"`
	NextVisitNotes    string     `gorm:"not null;default:''"`
}

func (SessionNote) TableName() string { return "session_notes" }
func (SessionNote) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*SessionNote)(nil)
