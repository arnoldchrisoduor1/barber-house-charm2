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
	Status         string    `gorm:"not null;default:draft"`
}

func (Payslip) TableName() string { return "payslips" }
func (Payslip) IsTenantScoped()   {}

var (
	_ tenancy.OrgScoped = (*CommissionRule)(nil)
	_ tenancy.OrgScoped = (*Payslip)(nil)
)
