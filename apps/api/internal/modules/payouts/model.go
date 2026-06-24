package payouts

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Payout struct {
	database.Base
	OrganizationID    uuid.UUID `gorm:"type:uuid;not null;index"`
	AmountKES         int64     `gorm:"not null"`
	Status            string    `gorm:"type:payout_status;not null;default:pending"`
	MerchantReference string    `gorm:"not null;uniqueIndex"`
	OpenfloatRef      string
	FailureReason     string
}

func (Payout) TableName() string { return "payouts" }
func (Payout) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Payout)(nil)
