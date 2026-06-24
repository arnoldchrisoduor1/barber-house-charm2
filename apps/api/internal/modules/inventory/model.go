package inventory

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Item struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	Name           string    `gorm:"not null"`
	SKU            string
	Quantity       int       `gorm:"not null;default:0"`
	Unit           string    `gorm:"not null;default:unit"`
	ReorderLevel   int       `gorm:"not null;default:0"`
}

func (Item) TableName() string { return "inventory" }
func (Item) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Item)(nil)
