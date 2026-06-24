package features

import (
	"context"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) SyncCatalog(ctx context.Context, reg *Registry) error {
	for _, entry := range reg.Features {
		f := Feature{
			Key:            entry.Key,
			Label:          entry.Label,
			Description:    entry.Description,
			Category:       entry.Category,
			MinPlan:        entry.MinPlan,
			DefaultEnabled: entry.Default,
			DependsOn:      pq.StringArray(entry.DependsOn),
			Status:         entry.Status,
		}
		if err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "key"}},
			DoUpdates: clause.AssignmentColumns([]string{"label", "description", "category", "min_plan", "default_enabled", "depends_on", "status", "updated_at"}),
		}).Create(&f).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) ListFlags(ctx context.Context) ([]FeatureFlag, error) {
	var flags []FeatureFlag
	err := r.db.WithContext(ctx).Find(&flags).Error
	return flags, err
}

func (r *Repository) ListOrgOverrides(ctx context.Context, orgID uuid.UUID) ([]OrganizationFeature, error) {
	var rows []OrganizationFeature
	err := r.db.WithContext(ctx).Where("organization_id = ?", orgID).Find(&rows).Error
	return rows, err
}

func (r *Repository) GetOrgPlan(ctx context.Context, orgID uuid.UUID) (string, error) {
	var plan string
	err := r.db.WithContext(ctx).
		Table("subscriptions").
		Select("plan").
		Where("organization_id = ?", orgID).
		Scan(&plan).Error
	return plan, err
}
