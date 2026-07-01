package inventory

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Item struct {
	database.Base
	OrganizationID  uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID        *uuid.UUID `gorm:"type:uuid"`
	Name            string     `gorm:"not null"`
	SKU             string
	Category        string
	Quantity        int        `gorm:"not null;default:0"`
	Unit            string     `gorm:"not null;default:unit"`
	UnitCostKES     int        `gorm:"not null;default:0"`
	ReorderLevel    int        `gorm:"not null;default:0"`
	Supplier        string
	SupplierID      *uuid.UUID `gorm:"type:uuid"`
	LastRestockedAt *time.Time
}

func (Item) TableName() string { return "inventory" }
func (Item) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Item)(nil)

type PriceLock struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	EntityType     string     `gorm:"not null"`
	EntityID       uuid.UUID  `gorm:"type:uuid;not null"`
	LockedPriceKES int        `gorm:"not null;default:0"`
	LockedBy       *uuid.UUID `gorm:"type:uuid"`
	Reason         string
	ExpiresAt      *time.Time
	IsActive       bool       `gorm:"not null;default:true"`
}

func (PriceLock) TableName() string { return "price_locks" }
func (PriceLock) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*PriceLock)(nil)
