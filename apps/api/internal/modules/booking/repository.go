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

type ListFilter struct {
	BranchID      *uuid.UUID
	CustomerPhone string
	Status        string
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, orgID uuid.UUID, filter ListFilter) ([]Booking, error) {
	var rows []Booking
	q := r.db.WithContext(ctx).
		Scopes(platformtenancy.OrgScope(orgID), platformtenancy.OptionalBranchScope(filter.BranchID))
	if filter.CustomerPhone != "" {
		q = q.Where(
			"customer_id IN (?)",
			r.db.Table("customers").
				Select("id").
				Where("organization_id = ? AND phone = ?", orgID, filter.CustomerPhone),
		)
	}
	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	err := q.Order("booking_date DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) ListServices(ctx context.Context, orgID, bookingID uuid.UUID) ([]BookingService, error) {
	var rows []BookingService
	err := r.db.WithContext(ctx).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("booking_id = ?", bookingID).
		Find(&rows).Error
	return rows, err
}

func (r *Repository) MarkCompleted(ctx context.Context, orgID, bookingID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Scopes(platformtenancy.OrgScope(orgID)).
		Model(&Booking{}).
		Where("id = ? AND status = ?", bookingID, "scheduled").
		Update("status", "completed").Error
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

// ScheduleAllows returns true when the staff member's schedule permits a booking
// in the given window. If no schedule row exists for the date, it defaults to allowed
// so that organizations that have not configured schedules are not blocked.
func (r *Repository) ScheduleAllows(ctx context.Context, orgID, staffID uuid.UUID, date time.Time, start, end string) (bool, error) {
	type scheduleRow struct {
		IsDayOff  bool
		StartTime string
		EndTime   string
	}
	var rows []scheduleRow
	err := r.db.WithContext(ctx).
		Table("staff_schedules").
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("staff_id = ? AND schedule_date = ?", staffID, date.Format("2006-01-02")).
		Select("is_day_off", "start_time", "end_time").
		Scan(&rows).Error
	if err != nil {
		return false, err
	}
	if len(rows) == 0 {
		return true, nil
	}
	for _, row := range rows {
		if row.IsDayOff {
			return false, nil
		}
		if start >= normalizeTime(row.StartTime) && end <= normalizeTime(row.EndTime) {
			return true, nil
		}
	}
	return false, nil
}

func normalizeTime(t string) string {
	if len(t) >= 5 {
		return t[:5]
	}
	return t
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
