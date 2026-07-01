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

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Item, error) {
	var row Item
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) Create(ctx context.Context, item *Item) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *Repository) Update(ctx context.Context, orgID uuid.UUID, item *Item) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(item).Error
}

func (r *Repository) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&Item{}, "id = ?", id).Error
}

func (r *Repository) ListPriceLocks(ctx context.Context, orgID uuid.UUID) ([]PriceLock, error) {
	var rows []PriceLock
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetPriceLock(ctx context.Context, orgID, id uuid.UUID) (*PriceLock, error) {
	var row PriceLock
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreatePriceLock(ctx context.Context, lock *PriceLock) error {
	return r.db.WithContext(ctx).Create(lock).Error
}

func (r *Repository) UpdatePriceLock(ctx context.Context, orgID uuid.UUID, lock *PriceLock) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(lock).Error
}

func (r *Repository) DeletePriceLock(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&PriceLock{}, "id = ?", id).Error
}
