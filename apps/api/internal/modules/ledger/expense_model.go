package ledger

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Expense struct {
	database.Base
	OrganizationID   uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID         *uuid.UUID `gorm:"type:uuid"`
	AmountKES        int64      `gorm:"not null;default:0"`
	Category         string     `gorm:"not null;default:general"`
	Description      string
	ReceiptURL       string
	ExpenseDate      time.Time  `gorm:"type:date;not null"`
	CreatedByUserID  *uuid.UUID `gorm:"type:uuid"`
}

func (Expense) TableName() string { return "expenses" }
func (Expense) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Expense)(nil)
