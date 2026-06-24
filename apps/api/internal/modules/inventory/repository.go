package inventory

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID) ([]Item, error) {
	var rows []Item
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("name ASC").Find(&rows).Error
	return rows, err
}
