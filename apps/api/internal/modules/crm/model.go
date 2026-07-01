package crm

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Customer struct {
	database.Base
	OrganizationID    uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID          *uuid.UUID `gorm:"type:uuid"`
	AssignedStaffID   *uuid.UUID `gorm:"type:uuid;index"`
	FullName          string     `gorm:"not null"`
	Phone             string
	Email             string
	Notes             string
	StylePreferences  string
	LoyaltyTier       string     `gorm:"type:loyalty_tier;not null;default:bronze"`
	TotalVisits       int        `gorm:"not null;default:0"`
	TotalSpent        int        `gorm:"not null;default:0"`
	LoyaltyPoints     int        `gorm:"not null;default:0"`
	LastVisitAt       *time.Time
}

func (Customer) TableName() string { return "customers" }
func (Customer) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Customer)(nil)
