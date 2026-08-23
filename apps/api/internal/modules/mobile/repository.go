package mobile

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

func (r *Repository) ListZones(ctx context.Context, orgID uuid.UUID) ([]CoverageZone, error) {
	var rows []CoverageZone
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetZone(ctx context.Context, orgID, id uuid.UUID) (*CoverageZone, error) {
	var row CoverageZone
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreateZone(ctx context.Context, row *CoverageZone) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateZone(ctx context.Context, orgID uuid.UUID, row *CoverageZone) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) DeleteZone(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&CoverageZone{}, "id = ?", id).Error
}

func (r *Repository) ListJobs(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID, status string) ([]FieldJob, error) {
	var rows []FieldJob
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID))
	if staffID != nil {
		q = q.Where("staff_id = ?", *staffID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	err := q.Order("scheduled_at ASC NULLS LAST, created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetJob(ctx context.Context, orgID, id uuid.UUID) (*FieldJob, error) {
	var row FieldJob
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreateJob(ctx context.Context, row *FieldJob) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateJob(ctx context.Context, orgID uuid.UUID, row *FieldJob) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) DeleteJob(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&FieldJob{}, "id = ?", id).Error
}
