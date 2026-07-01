package marketing

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Promotion struct {
	database.Base
	OrganizationID   uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID         *uuid.UUID `gorm:"type:uuid"`
	Name             string     `gorm:"not null"`
	Description      string
	PromoCode        string
	DiscountType     string     `gorm:"not null;default:percent"`
	DiscountValue    float64    `gorm:"not null;default:0"`
	MinSpendKES      *int
	MaxUses          *int
	CurrentUses      int        `gorm:"not null;default:0"`
	IsFirstTimeOnly  bool       `gorm:"not null;default:false"`
	IsActive         bool       `gorm:"not null;default:true"`
	StartsAt         time.Time  `gorm:"not null;default:now()"`
	EndsAt           *time.Time
}

func (Promotion) TableName() string { return "promotions" }
func (Promotion) IsTenantScoped()   {}

type Referral struct {
	ID                 uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID     uuid.UUID  `gorm:"type:uuid;not null;index"`
	ReferrerCustomerID uuid.UUID  `gorm:"type:uuid;not null"`
	ReferredCustomerID *uuid.UUID `gorm:"type:uuid"`
	ReferralCode       string     `gorm:"not null"`
	RewardKES          int        `gorm:"not null;default:0"`
	Status             string     `gorm:"not null;default:pending"`
	CompletedAt        *time.Time
	CreatedAt          time.Time
}

func (Referral) TableName() string { return "referrals" }
func (Referral) IsTenantScoped()   {}

type LoyaltyReward struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	Name           string    `gorm:"not null"`
	Description    string
	PointsRequired int       `gorm:"not null;default:0"`
	RewardType     string
	RewardValue    float64
	IsActive       bool      `gorm:"not null;default:true"`
}

func (LoyaltyReward) TableName() string { return "loyalty_rewards" }
func (LoyaltyReward) IsTenantScoped()   {}

type Review struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	CustomerID     uuid.UUID  `gorm:"type:uuid;not null"`
	StaffID        *uuid.UUID `gorm:"type:uuid"`
	BookingID      *uuid.UUID `gorm:"type:uuid"`
	Rating         int        `gorm:"not null"`
	Comment        string
	CreatedAt      time.Time
}

func (Review) TableName() string { return "reviews" }
func (Review) IsTenantScoped()   {}

type ServicePackage struct {
	database.Base
	OrganizationID  uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID        *uuid.UUID `gorm:"type:uuid"`
	Name            string     `gorm:"not null"`
	Description     string
	PackageType     string     `gorm:"not null;default:sessions"`
	ServiceCategory string     `gorm:"not null;default:''"`
	PriceKES        int        `gorm:"not null;default:0"`
	TotalSessions   int        `gorm:"not null;default:1"`
	ValidDays       int        `gorm:"not null;default:365"`
	IsActive        bool       `gorm:"not null;default:true"`
}

func (ServicePackage) TableName() string { return "service_packages" }
func (ServicePackage) IsTenantScoped()   {}

type CustomerPackage struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	CustomerID     *uuid.UUID `gorm:"type:uuid"`
	PackageID      *uuid.UUID `gorm:"type:uuid"`
	AmountPaid     int        `gorm:"not null;default:0"`
	SessionsUsed   int        `gorm:"not null;default:0"`
	Status         string     `gorm:"not null;default:active"`
	PurchasedAt    time.Time  `gorm:"not null;default:now()"`
	ExpiresAt      *time.Time
	CreatedAt      time.Time
}

func (CustomerPackage) TableName() string { return "customer_packages" }
func (CustomerPackage) IsTenantScoped()   {}

type GiftCard struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID  uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID        *uuid.UUID `gorm:"type:uuid"`
	Code            string     `gorm:"not null"`
	InitialBalance  int        `gorm:"not null;default:0"`
	CurrentBalance  int        `gorm:"not null;default:0"`
	RecipientName   string
	RecipientPhone  string
	Message         string
	IssuedBy        *uuid.UUID `gorm:"type:uuid"`
	IsActive        bool       `gorm:"not null;default:true"`
	CreatedAt       time.Time
}

func (GiftCard) TableName() string { return "gift_cards" }
func (GiftCard) IsTenantScoped()   {}

type GiftCardRedemption struct {
	ID               uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID   uuid.UUID  `gorm:"type:uuid;not null;index"`
	GiftCardID       uuid.UUID  `gorm:"type:uuid;not null"`
	TransactionID    *uuid.UUID `gorm:"type:uuid"`
	AmountRedeemed   int        `gorm:"not null;default:0"`
	RemainingBalance int        `gorm:"not null;default:0"`
	RedeemedBy       *uuid.UUID `gorm:"type:uuid"`
	RedeemedAt       time.Time  `gorm:"not null;default:now()"`
}

func (GiftCardRedemption) TableName() string { return "gift_card_redemptions" }
func (GiftCardRedemption) IsTenantScoped()   {}

type Campaign struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	Name           string     `gorm:"not null"`
	Channel        string     `gorm:"not null;default:email"`
	Status         string     `gorm:"not null;default:draft"`
	Subject        string
	Body           string
	ScheduledAt    *time.Time
	SentAt         *time.Time
}

func (Campaign) TableName() string { return "marketing_campaigns" }
func (Campaign) IsTenantScoped()   {}

var (
	_ tenancy.OrgScoped = (*Promotion)(nil)
	_ tenancy.OrgScoped = (*Referral)(nil)
	_ tenancy.OrgScoped = (*LoyaltyReward)(nil)
	_ tenancy.OrgScoped = (*Review)(nil)
	_ tenancy.OrgScoped = (*ServicePackage)(nil)
	_ tenancy.OrgScoped = (*CustomerPackage)(nil)
	_ tenancy.OrgScoped = (*GiftCard)(nil)
	_ tenancy.OrgScoped = (*GiftCardRedemption)(nil)
	_ tenancy.OrgScoped = (*Campaign)(nil)
)
