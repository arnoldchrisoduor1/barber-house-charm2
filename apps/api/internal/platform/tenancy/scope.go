package tenancy

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrgScoped interface {
	IsTenantScoped()
}

func OrgScope(orgID uuid.UUID) func(*gorm.DB) *gorm.DB {
	return func(tx *gorm.DB) *gorm.DB {
		return tx.Where("organization_id = ?", orgID)
	}
}
