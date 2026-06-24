package booking

import (
	"context"
	"time"

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID) ([]Booking, error) {
	var rows []Booking
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("booking_date DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Booking, error) {
	var row Booking
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) Create(ctx context.Context, booking *Booking) error {
	return r.db.WithContext(ctx).Create(booking).Error
}

func (r *Repository) Update(ctx context.Context, orgID uuid.UUID, booking *Booking) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(booking).Error
}

func (r *Repository) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&Booking{}, "id = ?", id).Error
}

func (r *Repository) StaffConflicts(ctx context.Context, orgID uuid.UUID, staffID uuid.UUID, date time.Time, start, end string, excludeID *uuid.UUID) (int64, error) {
	q := r.db.WithContext(ctx).Model(&Booking{}).Scopes(platformtenancy.OrgScope(orgID)).
		Where("staff_id = ? AND booking_date = ? AND status NOT IN ?", staffID, date, []string{"cancelled", "no_show"}).
		Where("start_time < ? AND end_time > ?", end, start)
	if excludeID != nil {
		q = q.Where("id <> ?", *excludeID)
	}
	var count int64
	err := q.Count(&count).Error
	return count, err
}
