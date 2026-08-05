package resources

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Resource struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	Name           string     `gorm:"not null"`
	ResourceType   string     `gorm:"type:resource_type;not null;default:room"`
	Capacity       int        `gorm:"not null;default:1"`
	Status         string     `gorm:"type:resource_status;not null;default:available"`
	Notes          string     `gorm:"not null;default:''"`
}

func (Resource) TableName() string { return "resources" }
func (Resource) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Resource)(nil)
