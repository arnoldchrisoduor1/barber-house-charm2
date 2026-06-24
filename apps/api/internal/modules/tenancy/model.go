package tenancy

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Organization struct {
	database.Base
	Name         string `gorm:"not null"`
	Slug         string `gorm:"not null;uniqueIndex"`
	BusinessType string `gorm:"type:business_type;not null;default:barber"`
	Timezone     string `gorm:"not null;default:Africa/Nairobi"`
	Currency     string `gorm:"not null;default:KES"`
}

func (Organization) TableName() string { return "organizations" }
func (Organization) IsTenantScoped()    {}

type OrganizationMember struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_org_member"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_org_member"`
	IsActive       bool      `gorm:"not null;default:true"`
	JoinedAt       time.Time `gorm:"not null;default:now()"`
}

func (OrganizationMember) TableName() string { return "organization_members" }

type UserRole struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_role"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_role"`
	Role           string    `gorm:"type:app_role;not null;uniqueIndex:idx_user_role"`
	CreatedAt      time.Time
}

func (UserRole) TableName() string { return "user_roles" }

type Subscription struct {
	database.Base
	OrganizationID     uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex"`
	Plan               string     `gorm:"type:subscription_plan;not null;default:starter"`
	Status             string     `gorm:"type:subscription_status;not null;default:trial"`
	TrialEndsAt        *time.Time
	CurrentPeriodStart *time.Time
	CurrentPeriodEnd   *time.Time
}

func (Subscription) TableName() string { return "subscriptions" }

type Branch struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	Name           string    `gorm:"not null"`
	Address        string
	Phone          string
	IsActive       bool      `gorm:"not null;default:true"`
}

func (Branch) TableName() string  { return "branches" }
func (Branch) IsTenantScoped()    {}

type TenantWallet struct {
	database.Base
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	BalanceKES     int64     `gorm:"not null;default:0"`
	ReserveKES     int64     `gorm:"not null;default:0"`
	Currency       string    `gorm:"not null;default:KES"`
}

func (TenantWallet) TableName() string { return "tenant_wallets" }
func (TenantWallet) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Branch)(nil)
