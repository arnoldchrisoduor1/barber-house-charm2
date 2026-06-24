package features

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Feature struct {
	Key            string    `gorm:"primaryKey;column:key"`
	Label          string    `gorm:"not null"`
	Description    string
	Category       string    `gorm:"not null;default:core"`
	MinPlan        string    `gorm:"column:min_plan;not null;default:starter"`
	DefaultEnabled bool      `gorm:"column:default_enabled;not null;default:false"`
	DependsOn      pq.StringArray `gorm:"type:text[];not null;default:'{}'"`
	Status         string    `gorm:"not null;default:ga"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (Feature) TableName() string { return "features" }

type OrganizationFeature struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_org_feature"`
	FeatureKey     string    `gorm:"not null;uniqueIndex:idx_org_feature"`
	Enabled        bool      `gorm:"not null"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (OrganizationFeature) TableName() string { return "organization_features" }

type FeatureFlag struct {
	Key            string `gorm:"primaryKey;column:key"`
	Enabled        bool   `gorm:"not null;default:true"`
	RolloutPercent int    `gorm:"not null;default:100"`
	UpdatedAt      time.Time
}

func (FeatureFlag) TableName() string { return "feature_flags" }
