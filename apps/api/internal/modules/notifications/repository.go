package notifications

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, n *Notification) error {
	return r.db.WithContext(ctx).Create(n).Error
}

func (r *Repository) UpdateStatus(ctx context.Context, orgID, id uuid.UUID, status, externalRef, errMsg string) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Model(&Notification{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":        status,
			"external_ref":  externalRef,
			"error_message": errMsg,
		}).Error
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Notification, error) {
	var row Notification
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}
