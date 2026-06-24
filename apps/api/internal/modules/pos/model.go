package pos

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Transaction struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	CustomerID     *uuid.UUID `gorm:"type:uuid"`
	AmountKES      int        `gorm:"not null"`
	PaymentMethod  string     `gorm:"type:payment_method;not null;default:cash"`
	PaymentStatus  string     `gorm:"type:payment_status;not null;default:pending"`
	Reference      string
}

func (Transaction) TableName() string { return "transactions" }
func (Transaction) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Transaction)(nil)
