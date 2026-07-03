package pos

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (r *Repository) ListTips(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Tip, error) {
	var rows []Tip
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC")
	if branchID != nil {
		q = q.Joins("JOIN staff ON staff.id = tips.staff_id AND staff.organization_id = tips.organization_id").
			Where("staff.branch_id IS NULL OR staff.branch_id = ?", *branchID)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *Repository) CreateTip(ctx context.Context, row *Tip) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateTip(ctx context.Context, orgID uuid.UUID, row *Tip) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) DeleteTip(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&Tip{}, "id = ?", id).Error
}

func (r *Repository) GetTip(ctx context.Context, orgID, id uuid.UUID) (*Tip, error) {
	var row Tip
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) ActiveShift(ctx context.Context, orgID, staffID uuid.UUID) (*PosShift, error) {
	var row PosShift
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("staff_id = ? AND closed_at IS NULL", staffID).
		Order("opened_at DESC").First(&row).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &row, err
}

func (r *Repository) OpenShift(ctx context.Context, row *PosShift) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) CloseShift(ctx context.Context, orgID uuid.UUID, row *PosShift) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) GetShift(ctx context.Context, orgID, id uuid.UUID) (*PosShift, error) {
	var row PosShift
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}
