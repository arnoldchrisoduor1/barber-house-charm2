package services

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Service struct {
	database.Base
	OrganizationID  uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID        *uuid.UUID `gorm:"type:uuid"`
	Name            string     `gorm:"not null"`
	Category        string
	PriceKES        int        `gorm:"not null;default:0"`
	DurationMinutes int        `gorm:"not null;default:30"`
	Description     string
	ImageURL        string
	IsActive        bool       `gorm:"not null;default:true"`
}

func (Service) TableName() string { return "services" }
func (Service) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Service)(nil)
