package consumption

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Log struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CreatedAt      time.Time
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	InventoryID    *uuid.UUID `gorm:"type:uuid"`
	ServiceID      *uuid.UUID `gorm:"type:uuid"`
	StaffID        *uuid.UUID `gorm:"type:uuid"`
	Quantity       int        `gorm:"not null;default:1"`
	Unit           string     `gorm:"not null;default:unit"`
	Notes          string
	ConsumedAt     time.Time  `gorm:"not null;default:now()"`
}

func (Log) TableName() string { return "consumption_logs" }
func (Log) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Log)(nil)
