package crm

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Customer, error) {
	var rows []Customer
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID))
	if branchID != nil {
		q = q.Where("branch_id IS NULL OR branch_id = ?", *branchID)
	}
	err := q.Order("full_name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Customer, error) {
	var row Customer
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) Create(ctx context.Context, customer *Customer) error {
	return r.db.WithContext(ctx).Create(customer).Error
}

func (r *Repository) Update(ctx context.Context, orgID uuid.UUID, customer *Customer) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(customer).Error
}

func generateReferralCode() string {
	buf := make([]byte, 4)
	_, _ = rand.Read(buf)
	return "REF" + hex.EncodeToString(buf)
}

func (r *Repository) ensureReferralCode(ctx context.Context, orgID, customerID uuid.UUID) error {
	return r.db.WithContext(ctx).Exec(
		`UPDATE customers SET referral_code = ? WHERE id = ? AND organization_id = ? AND (referral_code IS NULL OR referral_code = '')`,
		generateReferralCode(), customerID, orgID,
	).Error
}

func (r *Repository) FindOrCreateByPhone(ctx context.Context, orgID uuid.UUID, fullName, phone string) (*Customer, error) {
	var existing Customer
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Where("phone = ?", phone).First(&existing).Error
	if err == nil {
		_ = r.ensureReferralCode(ctx, orgID, existing.ID)
		return &existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	customer := &Customer{
		OrganizationID: orgID,
		FullName:       fullName,
		Phone:          phone,
	}
	if err := r.db.WithContext(ctx).Create(customer).Error; err != nil {
		return nil, err
	}
	_ = r.ensureReferralCode(ctx, orgID, customer.ID)
	return customer, nil
}

func (r *Repository) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&Customer{}, "id = ?", id).Error
}

func (r *Repository) ListByStaff(ctx context.Context, orgID, staffID uuid.UUID) ([]Customer, error) {
	var rows []Customer
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("assigned_staff_id = ?", staffID).Order("full_name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) ListOwnership(ctx context.Context, orgID uuid.UUID) ([]Customer, error) {
	var rows []Customer
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("assigned_staff_id IS NOT NULL").Order("full_name ASC").Find(&rows).Error
	return rows, err
}
