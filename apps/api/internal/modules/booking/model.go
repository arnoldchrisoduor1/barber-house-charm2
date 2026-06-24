package booking

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Booking struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index:idx_bookings_org_date,priority:1"`
	CustomerID     uuid.UUID  `gorm:"type:uuid;not null"`
	StaffID        *uuid.UUID `gorm:"type:uuid"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	BookingDate    time.Time  `gorm:"type:date;index:idx_bookings_org_date,priority:2"`
	StartTime      string     `gorm:"type:time;not null"`
	EndTime        string     `gorm:"type:time;not null"`
	Status         string     `gorm:"type:booking_status;not null;default:scheduled"`
	IsWalkin       bool       `gorm:"not null;default:false"`
	Notes          string
}

func (Booking) TableName() string { return "bookings" }
func (Booking) IsTenantScoped()   {}

type BookingService struct {
	database.Base
	OrganizationID  uuid.UUID `gorm:"type:uuid;not null;index"`
	BookingID       uuid.UUID `gorm:"type:uuid;not null;index"`
	ServiceName     string    `gorm:"not null"`
	DurationMinutes int       `gorm:"not null;default:30"`
	PriceKES        int       `gorm:"not null;default:0"`
}

func (BookingService) TableName() string { return "booking_services" }
func (BookingService) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Booking)(nil)
