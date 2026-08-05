package therapy

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID, customerID *uuid.UUID) ([]SessionNote, error) {
	var rows []SessionNote
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID))
	if customerID != nil {
		q = q.Where("customer_id = ?", *customerID)
	}
	err := q.Order("session_date DESC, created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*SessionNote, error) {
	var row SessionNote
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) Create(ctx context.Context, row *SessionNote) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) Update(ctx context.Context, orgID uuid.UUID, row *SessionNote) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&SessionNote{}, "id = ?", id).Error
}
