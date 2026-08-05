package resources

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Resource, error) {
	var rows []Resource
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID))
	if branchID != nil {
		q = q.Where("branch_id IS NULL OR branch_id = ?", *branchID)
	}
	err := q.Order("name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Resource, error) {
	var row Resource
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) Create(ctx context.Context, row *Resource) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) Update(ctx context.Context, orgID uuid.UUID, row *Resource) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&Resource{}, "id = ?", id).Error
}

func (r *Repository) BookingConflicts(ctx context.Context, orgID, resourceID uuid.UUID, date interface{}, start, end string, excludeID *uuid.UUID) (int64, error) {
	q := r.db.WithContext(ctx).Table("bookings").
		Where("organization_id = ? AND resource_id = ? AND booking_date = ? AND status NOT IN ?",
			orgID, resourceID, date, []string{"cancelled", "no_show"}).
		Where("start_time < ? AND end_time > ?", end, start)
	if excludeID != nil {
		q = q.Where("id <> ?", *excludeID)
	}
	var count int64
	err := q.Count(&count).Error
	return count, err
}
