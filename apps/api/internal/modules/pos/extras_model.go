package pos

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Tip struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID        uuid.UUID  `gorm:"type:uuid;not null"`
	CustomerID     *uuid.UUID `gorm:"type:uuid"`
	BookingID      *uuid.UUID `gorm:"type:uuid"`
	TransactionID  *uuid.UUID `gorm:"type:uuid"`
	AmountKES      int        `gorm:"not null"`
	Status         string     `gorm:"not null;default:pending"`
	PaymentMethod  string
	TipDate        time.Time `gorm:"type:date;not null"`
	Notes          string
}

func (Tip) TableName() string { return "tips" }
func (Tip) IsTenantScoped()   {}

type PosShift struct {
	database.Base
	OrganizationID   uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID         *uuid.UUID `gorm:"type:uuid"`
	StaffID          uuid.UUID  `gorm:"type:uuid;not null"`
	OpeningFloatKES  int        `gorm:"not null;default:0"`
	ClosingCountKES  *int
	VarianceKES      *int
	OpenedAt         time.Time  `gorm:"not null"`
	ClosedAt         *time.Time
}

func (PosShift) TableName() string { return "pos_shifts" }
func (PosShift) IsTenantScoped()   {}

var (
	_ tenancy.OrgScoped = (*Tip)(nil)
	_ tenancy.OrgScoped = (*PosShift)(nil)
)
