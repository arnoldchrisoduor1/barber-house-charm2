package crm

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Customer struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	FullName       string    `gorm:"not null"`
	Phone          string
	Email          string
	Notes          string
}

func (Customer) TableName() string { return "customers" }
func (Customer) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Customer)(nil)
