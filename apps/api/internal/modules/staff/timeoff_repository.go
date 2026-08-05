package staff

import (
	"context"
	"time"

	"github.com/google/uuid"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (r *Repository) ListTimeOff(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID) ([]TimeOffRequest, error) {
	var rows []TimeOffRequest
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC")
	if staffID != nil {
		q = q.Where("staff_id = ?", *staffID)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *Repository) GetTimeOff(ctx context.Context, orgID, id uuid.UUID) (*TimeOffRequest, error) {
	var row TimeOffRequest
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *Repository) CreateTimeOff(ctx context.Context, row *TimeOffRequest) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateTimeOff(ctx context.Context, orgID uuid.UUID, row *TimeOffRequest) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) StaffHasApprovedTimeOff(ctx context.Context, orgID, staffID uuid.UUID, date time.Time) (bool, error) {
	d := date.Format("2006-01-02")
	var count int64
	err := r.db.WithContext(ctx).Model(&TimeOffRequest{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("staff_id = ? AND status = ? AND start_date <= ? AND end_date >= ?", staffID, "approved", d, d).
		Count(&count).Error
	return count > 0, err
}
