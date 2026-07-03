package platform

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListOrganizations(ctx context.Context) ([]tenancymod.Organization, error) {
	var orgs []tenancymod.Organization
	err := r.db.WithContext(ctx).Order("created_at DESC").Limit(100).Find(&orgs).Error
	return orgs, err
}

func (r *Repository) IsPlatformAdmin(ctx context.Context, userID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&PlatformUser{}).
		Where("user_id = ? AND is_active = true", userID).
		Count(&count).Error
	return count > 0, err
}

func (r *Repository) AppendAudit(ctx context.Context, entry *AuditLog) error {
	return r.db.WithContext(ctx).Create(entry).Error
}

func (r *Repository) AppendOrgAudit(ctx context.Context, entry OrgAuditEntry) error {
	meta := entry.Metadata
	if meta == nil {
		meta = []byte("{}")
	}
	return r.db.WithContext(ctx).Exec(
		`INSERT INTO audit_log (organization_id, user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?::jsonb)`,
		entry.OrganizationID, entry.UserID, entry.Action, entry.EntityType, entry.EntityID, string(meta),
	).Error
}
