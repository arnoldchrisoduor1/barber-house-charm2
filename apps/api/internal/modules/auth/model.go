package auth

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
)

type User struct {
	database.Base
	Email           string     `gorm:"not null;uniqueIndex"`
	PasswordHash    string     `gorm:"not null"`
	EmailVerifiedAt *time.Time
}

func (User) TableName() string { return "users" }

type Profile struct {
	database.Base
	UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	FullName  string
	Phone     string
	AvatarURL string
}

func (Profile) TableName() string { return "profiles" }

type RefreshToken struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index"`
	TokenHash string    `gorm:"not null;uniqueIndex"`
	ExpiresAt time.Time `gorm:"not null"`
	RevokedAt *time.Time
	CreatedAt time.Time
}

func (RefreshToken) TableName() string { return "refresh_tokens" }
