package suppliers

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID) ([]Supplier, error) {
	var rows []Supplier
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Where("is_active = true").Order("name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Supplier, error) {
	var row Supplier
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) Create(ctx context.Context, row *Supplier) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) Update(ctx context.Context, orgID uuid.UUID, row *Supplier) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&Supplier{}).Scopes(platformtenancy.OrgScope(orgID)).
		Where("id = ?", id).Update("is_active", false).Error
}
