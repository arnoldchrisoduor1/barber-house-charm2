package platform

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
)

type PlatformUser struct {
	database.Base
	UserID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	Role     string    `gorm:"type:platform_role;not null;default:platform_admin"`
	IsActive bool      `gorm:"not null;default:true"`
}

func (PlatformUser) TableName() string { return "platform_users" }

type AuditLog struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ActorUserID *uuid.UUID
	Action      string    `gorm:"not null"`
	ResourceType string   `gorm:"not null"`
	ResourceID  string
	Metadata    []byte    `gorm:"type:jsonb;default:'{}'"`
	CreatedAt   time.Time
}

func (AuditLog) TableName() string { return "platform_audit_log" }
