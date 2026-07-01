package marketing

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

func listRows[T any](r *Repository, ctx context.Context, orgID uuid.UUID, order string) ([]T, error) {
	var rows []T
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID))
	if order != "" {
		q = q.Order(order)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func getRow[T any](r *Repository, ctx context.Context, orgID, id uuid.UUID) (*T, error) {
	var row T
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func createRow[T any](r *Repository, ctx context.Context, row *T) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func updateRow[T any](r *Repository, ctx context.Context, orgID uuid.UUID, row *T) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func deleteRow[T any](r *Repository, ctx context.Context, orgID, id uuid.UUID) error {
	var zero T
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&zero, "id = ?", id).Error
}

func (r *Repository) ListPromotions(ctx context.Context, orgID uuid.UUID) ([]Promotion, error) {
	return listRows[Promotion](r, ctx, orgID, "name ASC")
}

func (r *Repository) GetPromotion(ctx context.Context, orgID, id uuid.UUID) (*Promotion, error) {
	return getRow[Promotion](r, ctx, orgID, id)
}

func (r *Repository) CreatePromotion(ctx context.Context, row *Promotion) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdatePromotion(ctx context.Context, orgID uuid.UUID, row *Promotion) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeletePromotion(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[Promotion](r, ctx, orgID, id)
}

func (r *Repository) ListReferrals(ctx context.Context, orgID uuid.UUID) ([]Referral, error) {
	return listRows[Referral](r, ctx, orgID, "created_at DESC")
}

func (r *Repository) GetReferral(ctx context.Context, orgID, id uuid.UUID) (*Referral, error) {
	return getRow[Referral](r, ctx, orgID, id)
}

func (r *Repository) CreateReferral(ctx context.Context, row *Referral) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateReferral(ctx context.Context, orgID uuid.UUID, row *Referral) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteReferral(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[Referral](r, ctx, orgID, id)
}

func (r *Repository) ListLoyaltyRewards(ctx context.Context, orgID uuid.UUID) ([]LoyaltyReward, error) {
	return listRows[LoyaltyReward](r, ctx, orgID, "points_required ASC")
}

func (r *Repository) GetLoyaltyReward(ctx context.Context, orgID, id uuid.UUID) (*LoyaltyReward, error) {
	return getRow[LoyaltyReward](r, ctx, orgID, id)
}

func (r *Repository) CreateLoyaltyReward(ctx context.Context, row *LoyaltyReward) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateLoyaltyReward(ctx context.Context, orgID uuid.UUID, row *LoyaltyReward) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteLoyaltyReward(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[LoyaltyReward](r, ctx, orgID, id)
}

func (r *Repository) ListReviews(ctx context.Context, orgID uuid.UUID) ([]Review, error) {
	return listRows[Review](r, ctx, orgID, "created_at DESC")
}

func (r *Repository) GetReview(ctx context.Context, orgID, id uuid.UUID) (*Review, error) {
	return getRow[Review](r, ctx, orgID, id)
}

func (r *Repository) CreateReview(ctx context.Context, row *Review) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateReview(ctx context.Context, orgID uuid.UUID, row *Review) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteReview(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[Review](r, ctx, orgID, id)
}

func (r *Repository) ListServicePackages(ctx context.Context, orgID uuid.UUID) ([]ServicePackage, error) {
	return listRows[ServicePackage](r, ctx, orgID, "name ASC")
}

func (r *Repository) GetServicePackage(ctx context.Context, orgID, id uuid.UUID) (*ServicePackage, error) {
	return getRow[ServicePackage](r, ctx, orgID, id)
}

func (r *Repository) CreateServicePackage(ctx context.Context, row *ServicePackage) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateServicePackage(ctx context.Context, orgID uuid.UUID, row *ServicePackage) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteServicePackage(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[ServicePackage](r, ctx, orgID, id)
}

func (r *Repository) ListCustomerPackages(ctx context.Context, orgID uuid.UUID) ([]CustomerPackage, error) {
	return listRows[CustomerPackage](r, ctx, orgID, "purchased_at DESC")
}

func (r *Repository) GetCustomerPackage(ctx context.Context, orgID, id uuid.UUID) (*CustomerPackage, error) {
	return getRow[CustomerPackage](r, ctx, orgID, id)
}

func (r *Repository) CreateCustomerPackage(ctx context.Context, row *CustomerPackage) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateCustomerPackage(ctx context.Context, orgID uuid.UUID, row *CustomerPackage) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteCustomerPackage(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[CustomerPackage](r, ctx, orgID, id)
}

func (r *Repository) ListGiftCards(ctx context.Context, orgID uuid.UUID) ([]GiftCard, error) {
	return listRows[GiftCard](r, ctx, orgID, "created_at DESC")
}

func (r *Repository) GetGiftCard(ctx context.Context, orgID, id uuid.UUID) (*GiftCard, error) {
	return getRow[GiftCard](r, ctx, orgID, id)
}

func (r *Repository) CreateGiftCard(ctx context.Context, row *GiftCard) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateGiftCard(ctx context.Context, orgID uuid.UUID, row *GiftCard) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteGiftCard(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[GiftCard](r, ctx, orgID, id)
}

func (r *Repository) ListGiftCardRedemptions(ctx context.Context, orgID uuid.UUID) ([]GiftCardRedemption, error) {
	return listRows[GiftCardRedemption](r, ctx, orgID, "redeemed_at DESC")
}

func (r *Repository) GetGiftCardRedemption(ctx context.Context, orgID, id uuid.UUID) (*GiftCardRedemption, error) {
	return getRow[GiftCardRedemption](r, ctx, orgID, id)
}

func (r *Repository) CreateGiftCardRedemption(ctx context.Context, row *GiftCardRedemption) error {
	return createRow(r, ctx, row)
}

func (r *Repository) ListCampaigns(ctx context.Context, orgID uuid.UUID) ([]Campaign, error) {
	return listRows[Campaign](r, ctx, orgID, "created_at DESC")
}

func (r *Repository) GetCampaign(ctx context.Context, orgID, id uuid.UUID) (*Campaign, error) {
	return getRow[Campaign](r, ctx, orgID, id)
}

func (r *Repository) CreateCampaign(ctx context.Context, row *Campaign) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateCampaign(ctx context.Context, orgID uuid.UUID, row *Campaign) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteCampaign(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[Campaign](r, ctx, orgID, id)
}
