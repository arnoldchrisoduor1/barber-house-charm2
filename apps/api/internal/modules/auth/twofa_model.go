package auth

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
)

type UserTwoFactor struct {
	database.Base
	UserID    uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex"`
	IsEnabled bool       `gorm:"not null;default:false"`
	EnabledAt *time.Time
}

func (UserTwoFactor) TableName() string { return "user_two_factor" }
