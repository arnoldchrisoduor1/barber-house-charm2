package payouts

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID) ([]Payout, error) {
	var rows []Payout
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) Create(ctx context.Context, payout *Payout) error {
	return r.db.WithContext(ctx).Create(payout).Error
}

func (r *Repository) Update(ctx context.Context, orgID uuid.UUID, payout *Payout) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(payout).Error
}
