package pos

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Transaction struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	CustomerID     *uuid.UUID `gorm:"type:uuid"`
	BookingID      *uuid.UUID `gorm:"type:uuid"`
	AmountKES      int        `gorm:"not null"`
	PaymentMethod  string     `gorm:"type:payment_method;not null;default:cash"`
	PaymentStatus  string     `gorm:"type:payment_status;not null;default:pending"`
	Reference      string
	Items          []TransactionItem `gorm:"foreignKey:TransactionID"`
}

type TransactionItem struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	TransactionID  uuid.UUID `gorm:"type:uuid;not null;index"`
	ItemType       string    `gorm:"not null"`
	ItemID         uuid.UUID `gorm:"type:uuid;not null"`
	Name           string    `gorm:"not null"`
	UnitPriceKES   int       `gorm:"not null"`
	Quantity       int       `gorm:"not null"`
	LineTotalKES   int       `gorm:"not null"`
	CreatedAt      time.Time `gorm:"not null;default:now()"`
}

func (TransactionItem) TableName() string { return "transaction_items" }
func (TransactionItem) IsTenantScoped()   {}

func (Transaction) TableName() string { return "transactions" }
func (Transaction) IsTenantScoped()   {}

var (
	_ tenancy.OrgScoped = (*Transaction)(nil)
	_ tenancy.OrgScoped = (*TransactionItem)(nil)
)
