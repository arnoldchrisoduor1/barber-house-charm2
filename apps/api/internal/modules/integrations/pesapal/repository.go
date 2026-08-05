package pesapal

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

var ErrIntentNotFound = errors.New("payment intent not found")

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, intent *PaymentIntent) error {
	return r.db.WithContext(ctx).Create(intent).Error
}

// FindByMerchantReference looks up an intent org-agnostically: real Pesapal IPN calls are
// unauthenticated webhooks, so the merchant reference is the only trustworthy input — the
// org is then read off the stored row, never accepted from the caller.
func (r *Repository) FindByMerchantReference(ctx context.Context, ref string) (*PaymentIntent, error) {
	var row PaymentIntent
	err := r.db.WithContext(ctx).Where("merchant_reference = ?", ref).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrIntentNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find payment intent: %w", err)
	}
	return &row, nil
}

func (r *Repository) UpdateOrderTrackingID(ctx context.Context, orgID, id uuid.UUID, trackingID string) error {
	return r.db.WithContext(ctx).Model(&PaymentIntent{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("id = ?", id).
		Update("order_tracking_id", trackingID).Error
}

func (r *Repository) MarkStatus(ctx context.Context, orgID, id uuid.UUID, status string) error {
	return r.db.WithContext(ctx).Model(&PaymentIntent{}).
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("id = ?", id).
		Update("status", status).Error
}
