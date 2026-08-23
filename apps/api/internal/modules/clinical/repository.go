package clinical

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

func (r *Repository) ListIntake(ctx context.Context, orgID uuid.UUID, customerID *uuid.UUID) ([]PatientIntake, error) {
	var rows []PatientIntake
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID))
	if customerID != nil {
		q = q.Where("customer_id = ?", *customerID)
	}
	err := q.Order("updated_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetIntake(ctx context.Context, orgID, id uuid.UUID) (*PatientIntake, error) {
	var row PatientIntake
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreateIntake(ctx context.Context, row *PatientIntake) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateIntake(ctx context.Context, orgID uuid.UUID, row *PatientIntake) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) DeleteIntake(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&PatientIntake{}, "id = ?", id).Error
}

func (r *Repository) ListAftercare(ctx context.Context, orgID uuid.UUID) ([]AftercareInstruction, error) {
	var rows []AftercareInstruction
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("updated_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetAftercare(ctx context.Context, orgID, id uuid.UUID) (*AftercareInstruction, error) {
	var row AftercareInstruction
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreateAftercare(ctx context.Context, row *AftercareInstruction) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateAftercare(ctx context.Context, orgID uuid.UUID, row *AftercareInstruction) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) DeleteAftercare(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&AftercareInstruction{}, "id = ?", id).Error
}
