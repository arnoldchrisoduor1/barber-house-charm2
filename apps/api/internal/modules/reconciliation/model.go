package reconciliation

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

// Run is a day cash-up: expected totals are always server-computed from completed
// transactions, never entered by hand — only the counted till amounts and the resulting
// variance are operator input. See B2-06.
type Run struct {
	database.Base
	OrganizationID  uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID        *uuid.UUID `gorm:"type:uuid"`
	RunDate         time.Time  `gorm:"type:date;not null"`
	ExpectedCashKES int64      `gorm:"not null;default:0"`
	ExpectedCardKES int64      `gorm:"not null;default:0"`
	CountedCashKES  *int64
	CountedCardKES  *int64
	VarianceKES     *int64
	Status          string `gorm:"not null;default:open"`
	Notes           string
	ClosedByUserID  *uuid.UUID `gorm:"type:uuid"`
	ClosedAt        *time.Time
}

func (Run) TableName() string { return "reconciliation_runs" }
func (Run) IsTenantScoped()   {}

const (
	StatusOpen   = "open"
	StatusClosed = "closed"
)

var _ tenancy.OrgScoped = (*Run)(nil)
