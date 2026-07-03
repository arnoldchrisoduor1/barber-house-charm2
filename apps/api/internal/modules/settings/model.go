package settings

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type NotificationSettings struct {
	database.Base
	OrganizationID         uuid.UUID       `gorm:"type:uuid;not null;uniqueIndex"`
	EmailReminders       bool            `gorm:"not null;default:true"`
	SMSReminders         bool            `gorm:"not null;default:true"`
	WhatsAppReminders    bool            `gorm:"column:whatsapp_reminders;not null;default:false"`
	MarketingEmails      bool            `gorm:"not null;default:false"`
	BookingConfirmations bool            `gorm:"not null;default:true"`
	Settings             json.RawMessage `gorm:"type:jsonb;not null;default:'{}'"`
}

func (NotificationSettings) TableName() string { return "notification_settings" }
func (NotificationSettings) IsTenantScoped()   {}

type Enquiry struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	Name           string     `gorm:"not null"`
	Email          string
	Phone          string
	Subject        string
	Message        string     `gorm:"not null"`
	IsRead         bool       `gorm:"not null;default:false"`
	CreatedAt      time.Time
}

func (Enquiry) TableName() string { return "enquiries" }
func (Enquiry) IsTenantScoped()   {}

type StaffChatMessage struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index" json:"-"`
	Channel        string     `gorm:"not null;default:general" json:"channel"`
	SenderID       uuid.UUID  `gorm:"type:uuid;not null" json:"sender_id"`
	Message        string     `gorm:"not null" json:"message"`
	ParentID       *uuid.UUID `gorm:"type:uuid" json:"parent_id,omitempty"`
	IsPinned       bool       `gorm:"not null;default:false" json:"is_pinned"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (StaffChatMessage) TableName() string { return "staff_chat_messages" }
func (StaffChatMessage) IsTenantScoped()   {}

type OrgBranding struct {
	database.Base
	OrganizationID             uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	LogoURL                    string
	PrimaryColor               string    `gorm:"not null;default:#D4A853"`
	SecondaryColor             string    `gorm:"not null;default:#1A1A2E"`
	AccentColor                string    `gorm:"not null;default:#E8C547"`
	HeadingFont                string    `gorm:"not null;default:Playfair Display"`
	BodyFont                   string    `gorm:"not null;default:Inter"`
	BusinessName               string
	Tagline                    string
	BookingWelcomeMessage      string
	BookingConfirmationMessage string
	ShowLogoOnBooking          bool      `gorm:"not null;default:true"`
}

func (OrgBranding) TableName() string { return "org_branding" }
func (OrgBranding) IsTenantScoped()   {}

type SeatRental struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID        *uuid.UUID `gorm:"type:uuid"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	SeatLabel      string     `gorm:"not null"`
	MonthlyRateKES int        `gorm:"not null;default:0"`
	StartedAt      *time.Time `gorm:"type:date"`
	EndedAt        *time.Time `gorm:"type:date"`
	Status         string     `gorm:"not null;default:active"`
	Notes          string
}

func (SeatRental) TableName() string { return "seat_rentals" }
func (SeatRental) IsTenantScoped()   {}

type GalleryItem struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID        *uuid.UUID `gorm:"type:uuid"`
	Title          string
	Description    string
	ImageURL       string     `gorm:"not null"`
	Category       string
	IsPublic       bool       `gorm:"not null;default:true"`
	SortOrder      int        `gorm:"not null;default:0"`
}

func (GalleryItem) TableName() string { return "gallery_items" }
func (GalleryItem) IsTenantScoped()   {}

type ConsentForm struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	CustomerID     *uuid.UUID `gorm:"type:uuid"`
	Title          string     `gorm:"not null"`
	FormType       string     `gorm:"not null;default:general"`
	Content        string
	SignatureURL   string
	IsSigned       bool       `gorm:"not null;default:false"`
	SignedAt       *time.Time
	ExpiresAt      *time.Time
	CreatedAt      time.Time
}

func (ConsentForm) TableName() string { return "consent_forms" }
func (ConsentForm) IsTenantScoped()   {}

type InboxNotification struct {
	ID             uuid.UUID       `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID       `gorm:"type:uuid;not null;index"`
	UserID         *uuid.UUID      `gorm:"type:uuid"`
	Title          string          `gorm:"not null"`
	Body           string
	Type           string          `gorm:"not null;default:info"`
	Metadata       json.RawMessage `gorm:"type:jsonb;not null;default:'{}'"`
	ReadAt         *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (InboxNotification) TableName() string { return "notifications" }
func (InboxNotification) IsTenantScoped()   {}

type WhatsAppLog struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	OrganizationID uuid.UUID `gorm:"type:uuid;not null" json:"-"`
	RecipientPhone string    `json:"recipient_phone"`
	TemplateKey    string    `json:"template_key"`
	Body           string    `json:"body"`
	Status         string    `json:"status"`
	ExternalRef    string    `json:"external_ref"`
	ErrorMessage   string    `json:"error_message"`
	CreatedAt      time.Time `json:"created_at"`
}

func (WhatsAppLog) TableName() string { return "notification_deliveries" }

var (
	_ tenancy.OrgScoped = (*NotificationSettings)(nil)
	_ tenancy.OrgScoped = (*Enquiry)(nil)
	_ tenancy.OrgScoped = (*StaffChatMessage)(nil)
	_ tenancy.OrgScoped = (*OrgBranding)(nil)
	_ tenancy.OrgScoped = (*SeatRental)(nil)
	_ tenancy.OrgScoped = (*GalleryItem)(nil)
	_ tenancy.OrgScoped = (*ConsentForm)(nil)
	_ tenancy.OrgScoped = (*InboxNotification)(nil)
)
