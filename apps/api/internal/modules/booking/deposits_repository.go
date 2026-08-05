package booking

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (r *Repository) GetBookingPolicy(ctx context.Context, orgID uuid.UUID) (*OrganizationBookingPolicy, error) {
	var row OrganizationBookingPolicy
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "organization_id = ?", orgID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *Repository) UpsertBookingPolicy(ctx context.Context, row *OrganizationBookingPolicy) error {
	return r.db.WithContext(ctx).Save(row).Error
}

func (r *Repository) ListBookingDeposits(ctx context.Context, orgID uuid.UUID) ([]BookingDeposit, error) {
	var rows []BookingDeposit
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetBookingDepositByBooking(ctx context.Context, orgID, bookingID uuid.UUID) (*BookingDeposit, error) {
	var row BookingDeposit
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("booking_id = ?", bookingID).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	return &row, err
}

func (r *Repository) CreateBookingDeposit(ctx context.Context, row *BookingDeposit) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) UpdateBookingDeposit(ctx context.Context, orgID uuid.UUID, row *BookingDeposit) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func (r *Repository) SumBookingServiceTotal(ctx context.Context, orgID, bookingID uuid.UUID) (int, error) {
	var total int
	err := r.db.WithContext(ctx).Table("booking_services").
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("booking_id = ?", bookingID).
		Select("COALESCE(SUM(price_kes), 0)").Scan(&total).Error
	return total, err
}
