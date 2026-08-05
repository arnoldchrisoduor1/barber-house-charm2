package payroll

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type CommissionRule struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID        uuid.UUID  `gorm:"type:uuid;not null"`
	ServiceID      *uuid.UUID `gorm:"type:uuid"`
	RatePct        float64    `gorm:"type:numeric(5,2);not null;default:0"`
}

func (CommissionRule) TableName() string { return "commission_rules" }
func (CommissionRule) IsTenantScoped()   {}

type Payslip struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	StaffID        uuid.UUID `gorm:"type:uuid;not null"`
	PeriodStart    time.Time `gorm:"type:date;not null"`
	PeriodEnd      time.Time `gorm:"type:date;not null"`
	GrossKES       int64     `gorm:"not null;default:0"`
	CommissionKES  int64     `gorm:"not null;default:0"`
	DeductionsKES  int64     `gorm:"not null;default:0"`
	NetKES         int64     `gorm:"not null;default:0"`
	DaysWorked     int       `gorm:"not null;default:0"`
	Status         string    `gorm:"not null;default:draft"`
}

func (Payslip) TableName() string { return "payslips" }
func (Payslip) IsTenantScoped()   {}

// CommissionLine is an immutable per-sale record: written once when a ticket completes,
// never edited. Corrections are a reversing 'adjustment' line, not a mutation — see
// docs/barber-phased-implementation-plan.md B2-03.
type CommissionLine struct {
	database.Base
	OrganizationID   uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID          uuid.UUID  `gorm:"type:uuid;not null;index"`
	TransactionID    *uuid.UUID `gorm:"type:uuid"`
	BookingID        *uuid.UUID `gorm:"type:uuid"`
	Kind             string     `gorm:"not null;default:service"`
	BaseKES          int64      `gorm:"not null;default:0"`
	RatePct          float64    `gorm:"type:numeric(5,2);not null;default:0"`
	AmountKES        int64      `gorm:"not null"`
	ReversedLineID   *uuid.UUID `gorm:"type:uuid"`
	Note             string
	CreatedByUserID  *uuid.UUID `gorm:"type:uuid"`
}

func (CommissionLine) TableName() string { return "commission_lines" }
func (CommissionLine) IsTenantScoped()   {}

const (
	CommissionLineKindService    = "service"
	CommissionLineKindAdjustment = "adjustment"
)

var (
	_ tenancy.OrgScoped = (*CommissionRule)(nil)
	_ tenancy.OrgScoped = (*Payslip)(nil)
	_ tenancy.OrgScoped = (*CommissionLine)(nil)
)
