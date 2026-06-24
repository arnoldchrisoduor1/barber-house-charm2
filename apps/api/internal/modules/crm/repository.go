package crm

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID) ([]Customer, error) {
	var rows []Customer
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("full_name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) Create(ctx context.Context, customer *Customer) error {
	return r.db.WithContext(ctx).Create(customer).Error
}
