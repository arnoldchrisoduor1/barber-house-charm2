package staff

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Staff struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	UserID         *uuid.UUID `gorm:"type:uuid"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	DisplayName    string     `gorm:"not null"`
	Title          string
	IsActive       bool       `gorm:"not null;default:true"`
}

func (Staff) TableName() string { return "staff" }
func (Staff) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Staff)(nil)
