package pesapal

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

// PaymentIntent is the server's own record of what an order was created for. IPN
// handling must resolve org + amount from here, never from the webhook body or a
// client-supplied query param — see 01-security-tenancy.mdc.
type PaymentIntent struct {
	database.Base
	OrganizationID    uuid.UUID `gorm:"type:uuid;not null;index"`
	MerchantReference string    `gorm:"not null;index"`
	OrderTrackingID   string
	AmountKES         int64      `gorm:"not null"`
	Currency          string     `gorm:"not null;default:KES"`
	Status            string     `gorm:"not null;default:pending"`
	TransactionID     *uuid.UUID `gorm:"type:uuid"`
}

func (PaymentIntent) TableName() string { return "payment_intents" }
func (PaymentIntent) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*PaymentIntent)(nil)

const (
	IntentPending   = "pending"
	IntentCompleted = "completed"
	IntentFailed    = "failed"
)
