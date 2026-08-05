package pos

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (r *Repository) GetPosSettings(ctx context.Context, orgID uuid.UUID) (*OrganizationPosSettings, error) {
	var row OrganizationPosSettings
	err := r.db.WithContext(ctx).First(&row, "organization_id = ?", orgID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *Repository) UpsertPosSettings(ctx context.Context, row *OrganizationPosSettings) error {
	return r.db.WithContext(ctx).Save(row).Error
}

func (r *Repository) ListTabs(ctx context.Context, orgID uuid.UUID, status string) ([]PosTab, error) {
	var rows []PosTab
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Preload("Items").Order("created_at DESC")
	if status != "" {
		q = q.Where("status = ?", status)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *Repository) GetTab(ctx context.Context, orgID, tabID uuid.UUID) (*PosTab, error) {
	var row PosTab
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Preload("Items").First(&row, "id = ?", tabID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	return &row, err
}

func (r *Repository) CreateTab(ctx context.Context, tab *PosTab) error {
	return r.db.WithContext(ctx).Create(tab).Error
}

func (r *Repository) UpdateTab(ctx context.Context, orgID uuid.UUID, tab *PosTab) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(tab).Error
}

func (r *Repository) CreateTabItem(ctx context.Context, item *PosTabItem) error {
	return r.db.WithContext(ctx).Create(item).Error
}
