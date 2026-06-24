package ledger

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type LedgerEntry struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	Account        string     `gorm:"type:ledger_account;not null"`
	Direction      string     `gorm:"type:ledger_direction;not null"`
	AmountKES      int64      `gorm:"not null"`
	TransactionID  *uuid.UUID `gorm:"type:uuid"`
	PayoutID       *uuid.UUID `gorm:"type:uuid"`
	Ref            string
	CreatedAt      time.Time
}

func (LedgerEntry) TableName() string { return "ledger_entries" }
func (LedgerEntry) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*LedgerEntry)(nil)
