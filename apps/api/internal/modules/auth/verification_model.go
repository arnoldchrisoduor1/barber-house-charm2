package auth

import (
	"time"

	"github.com/google/uuid"
)

type EmailVerificationToken struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index"`
	Token     string    `gorm:"not null;uniqueIndex"`
	ExpiresAt time.Time `gorm:"not null"`
	CreatedAt time.Time
}

func (EmailVerificationToken) TableName() string { return "email_verification_tokens" }

type StaffInvite struct {
	ID             uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	Email          string     `gorm:"not null"`
	Role           string     `gorm:"not null"`
	Token          string     `gorm:"not null;uniqueIndex"`
	InvitedBy      uuid.UUID  `gorm:"type:uuid;not null"`
	StaffID        *uuid.UUID `gorm:"type:uuid"`
	ExpiresAt      time.Time  `gorm:"not null"`
	AcceptedAt     *time.Time
	CreatedAt      time.Time
}

func (StaffInvite) TableName() string { return "staff_invites" }
