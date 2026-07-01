package staff

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Staff, error) {
	var rows []Staff
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Where("is_active = true")
	if branchID != nil {
		q = q.Where("branch_id IS NULL OR branch_id = ?", *branchID)
	}
	err := q.Order("display_name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Staff, error) {
	var row Staff
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) Create(ctx context.Context, member *Staff) error {
	return r.db.WithContext(ctx).Create(member).Error
}

func (r *Repository) Update(ctx context.Context, orgID uuid.UUID, member *Staff) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(member).Error
}

func (r *Repository) SoftDelete(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&Staff{}).Scopes(platformtenancy.OrgScope(orgID)).
		Where("id = ?", id).Update("is_active", false).Error
}

func (r *Repository) ListSchedules(ctx context.Context, orgID uuid.UUID) ([]StaffSchedule, error) {
	var rows []StaffSchedule
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("schedule_date DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetSchedule(ctx context.Context, orgID, id uuid.UUID) (*StaffSchedule, error) {
	var row StaffSchedule
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreateSchedule(ctx context.Context, schedule *StaffSchedule) error {
	return r.db.WithContext(ctx).Create(schedule).Error
}

func (r *Repository) UpdateSchedule(ctx context.Context, orgID uuid.UUID, schedule *StaffSchedule) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(schedule).Error
}

func (r *Repository) DeleteSchedule(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&StaffSchedule{}, "id = ?", id).Error
}
