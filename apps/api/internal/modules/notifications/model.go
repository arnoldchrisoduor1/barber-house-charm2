package notifications

import (
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Notification struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	RecipientPhone string    `gorm:"not null"`
	Channel        string    `gorm:"type:notification_channel;not null"`
	TemplateKey    string    `gorm:"not null"`
	Body           string
	Status         string `gorm:"type:notification_status;not null;default:pending"`
	BookingID      *uuid.UUID `gorm:"type:uuid"`
	ExternalRef    string
	ErrorMessage   string
}

func (Notification) TableName() string { return "notification_deliveries" }
func (Notification) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Notification)(nil)
