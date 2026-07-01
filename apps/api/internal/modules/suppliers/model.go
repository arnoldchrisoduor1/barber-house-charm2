package suppliers

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Supplier struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	Name           string    `gorm:"not null"`
	ContactName    string
	Phone          string
	Email          string
	Address        string
	Notes          string
	IsActive       bool      `gorm:"not null;default:true"`
}

func (Supplier) TableName() string { return "suppliers" }
func (Supplier) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Supplier)(nil)
