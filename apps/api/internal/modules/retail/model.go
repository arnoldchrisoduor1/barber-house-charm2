package retail

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Product struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	SKU            string
	Name           string     `gorm:"not null"`
	Category       string     `gorm:"not null;default:''"`
	Description    string
	CostKES        int        `gorm:"not null;default:0"`
	PriceKES       int        `gorm:"not null;default:0"`
	Quantity       int        `gorm:"not null;default:0"`
	ReorderLevel   int        `gorm:"not null;default:0"`
	ImageURL       string
	IsActive       bool       `gorm:"not null;default:true"`
}

func (Product) TableName() string { return "retail_products" }
func (Product) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Product)(nil)
