package staff

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (r *Repository) ListOnboardingTemplates(ctx context.Context, orgID uuid.UUID) ([]OnboardingChecklistTemplate, error) {
	var rows []OnboardingChecklistTemplate
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("sort_order ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) CreateOnboardingTemplate(ctx context.Context, row *OnboardingChecklistTemplate) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) ListOnboardingCompletions(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID) ([]OnboardingChecklistCompletion, error) {
	var rows []OnboardingChecklistCompletion
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID))
	if staffID != nil {
		q = q.Where("staff_id = ?", *staffID)
	}
	err := q.Order("created_at ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetOnboardingCompletion(ctx context.Context, orgID, staffID, templateID uuid.UUID) (*OnboardingChecklistCompletion, error) {
	var row OnboardingChecklistCompletion
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("staff_id = ? AND template_id = ?", staffID, templateID).
		First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	return &row, err
}

func (r *Repository) CreateOnboardingCompletion(ctx context.Context, row *OnboardingChecklistCompletion) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateOnboardingCompletion(ctx context.Context, orgID uuid.UUID, row *OnboardingChecklistCompletion) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) ListShiftSwaps(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID) ([]ShiftSwapRequest, error) {
	var rows []ShiftSwapRequest
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC")
	if staffID != nil {
		q = q.Where("from_staff_id = ? OR to_staff_id = ?", *staffID, *staffID)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *Repository) GetShiftSwap(ctx context.Context, orgID, id uuid.UUID) (*ShiftSwapRequest, error) {
	var row ShiftSwapRequest
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	return &row, err
}

func (r *Repository) CreateShiftSwap(ctx context.Context, row *ShiftSwapRequest) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateShiftSwap(ctx context.Context, orgID uuid.UUID, row *ShiftSwapRequest) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) GetScheduleByStaffDate(ctx context.Context, orgID, staffID uuid.UUID, date string) (*StaffSchedule, error) {
	var row StaffSchedule
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("staff_id = ? AND schedule_date = ?", staffID, date).
		First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}
