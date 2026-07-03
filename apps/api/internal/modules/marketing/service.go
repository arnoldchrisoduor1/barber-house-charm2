package marketing

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func mapNotFound[T any](row *T, err error) (*T, error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

type PromotionDTO struct {
	BranchID        *uuid.UUID `json:"branch_id"`
	Name            string     `json:"name"`
	Description     string     `json:"description"`
	PromoCode       string     `json:"promo_code"`
	DiscountType    string     `json:"discount_type"`
	DiscountValue   float64    `json:"discount_value"`
	MinSpendKES     *int       `json:"min_spend_kes"`
	MaxUses         *int       `json:"max_uses"`
	IsFirstTimeOnly *bool      `json:"is_first_time_only"`
	IsActive        *bool      `json:"is_active"`
	StartsAt        *time.Time `json:"starts_at"`
	EndsAt          *time.Time `json:"ends_at"`
}

func (s *Service) ListPromotions(ctx context.Context, orgID uuid.UUID) ([]Promotion, error) {
	return s.repo.ListPromotions(ctx, orgID)
}

func (s *Service) GetPromotion(ctx context.Context, orgID, id uuid.UUID) (*Promotion, error) {
	return mapNotFound(s.repo.GetPromotion(ctx, orgID, id))
}

func (s *Service) CreatePromotion(ctx context.Context, orgID uuid.UUID, dto PromotionDTO) (*Promotion, error) {
	active := true
	if dto.IsActive != nil {
		active = *dto.IsActive
	}
	firstTime := false
	if dto.IsFirstTimeOnly != nil {
		firstTime = *dto.IsFirstTimeOnly
	}
	starts := time.Now()
	if dto.StartsAt != nil {
		starts = *dto.StartsAt
	}
	row := &Promotion{
		OrganizationID:  orgID,
		BranchID:        dto.BranchID,
		Name:            dto.Name,
		Description:     dto.Description,
		PromoCode:       dto.PromoCode,
		DiscountType:    dto.DiscountType,
		DiscountValue:   dto.DiscountValue,
		MinSpendKES:     dto.MinSpendKES,
		MaxUses:         dto.MaxUses,
		IsFirstTimeOnly: firstTime,
		IsActive:        active,
		StartsAt:        starts,
		EndsAt:          dto.EndsAt,
	}
	if row.DiscountType == "" {
		row.DiscountType = "percent"
	}
	if err := s.repo.CreatePromotion(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdatePromotion(ctx context.Context, orgID, id uuid.UUID, dto PromotionDTO) (*Promotion, error) {
	row, err := s.GetPromotion(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Name != "" {
		row.Name = dto.Name
	}
	row.Description = dto.Description
	if dto.PromoCode != "" {
		row.PromoCode = dto.PromoCode
	}
	if dto.DiscountType != "" {
		row.DiscountType = dto.DiscountType
	}
	if dto.DiscountValue != 0 {
		row.DiscountValue = dto.DiscountValue
	}
	row.MinSpendKES = dto.MinSpendKES
	row.MaxUses = dto.MaxUses
	if dto.IsFirstTimeOnly != nil {
		row.IsFirstTimeOnly = *dto.IsFirstTimeOnly
	}
	if dto.IsActive != nil {
		row.IsActive = *dto.IsActive
	}
	if dto.StartsAt != nil {
		row.StartsAt = *dto.StartsAt
	}
	row.EndsAt = dto.EndsAt
	if dto.BranchID != nil {
		row.BranchID = dto.BranchID
	}
	if err := s.repo.UpdatePromotion(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeletePromotion(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetPromotion(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeletePromotion(ctx, orgID, id)
}

type ReferralDTO struct {
	ReferrerCustomerID uuid.UUID  `json:"referrer_customer_id"`
	ReferredCustomerID *uuid.UUID `json:"referred_customer_id"`
	ReferralCode       string     `json:"referral_code"`
	RewardKES          int        `json:"reward_kes"`
	Status             string     `json:"status"`
}

func (s *Service) ListReferrals(ctx context.Context, orgID uuid.UUID) ([]Referral, error) {
	return s.repo.ListReferrals(ctx, orgID)
}

func (s *Service) GetReferral(ctx context.Context, orgID, id uuid.UUID) (*Referral, error) {
	return mapNotFound(s.repo.GetReferral(ctx, orgID, id))
}

func (s *Service) CreateReferral(ctx context.Context, orgID uuid.UUID, dto ReferralDTO) (*Referral, error) {
	row := &Referral{
		OrganizationID:     orgID,
		ReferrerCustomerID: dto.ReferrerCustomerID,
		ReferredCustomerID: dto.ReferredCustomerID,
		ReferralCode:       dto.ReferralCode,
		RewardKES:          dto.RewardKES,
		Status:             dto.Status,
	}
	if row.Status == "" {
		row.Status = "pending"
	}
	if err := s.repo.CreateReferral(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateReferral(ctx context.Context, orgID, id uuid.UUID, dto ReferralDTO) (*Referral, error) {
	row, err := s.GetReferral(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.ReferredCustomerID != nil {
		row.ReferredCustomerID = dto.ReferredCustomerID
	}
	if dto.ReferralCode != "" {
		row.ReferralCode = dto.ReferralCode
	}
	if dto.RewardKES != 0 {
		row.RewardKES = dto.RewardKES
	}
	if dto.Status != "" {
		row.Status = dto.Status
		if dto.Status == "completed" {
			now := time.Now()
			row.CompletedAt = &now
		}
	}
	if err := s.repo.UpdateReferral(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteReferral(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetReferral(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteReferral(ctx, orgID, id)
}

type LoyaltyRewardDTO struct {
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	PointsRequired int     `json:"points_required"`
	RewardType     string  `json:"reward_type"`
	RewardValue    float64 `json:"reward_value"`
	IsActive       *bool   `json:"is_active"`
}

func (s *Service) ListLoyaltyRewards(ctx context.Context, orgID uuid.UUID) ([]LoyaltyReward, error) {
	return s.repo.ListLoyaltyRewards(ctx, orgID)
}

func (s *Service) GetLoyaltyReward(ctx context.Context, orgID, id uuid.UUID) (*LoyaltyReward, error) {
	return mapNotFound(s.repo.GetLoyaltyReward(ctx, orgID, id))
}

func (s *Service) CreateLoyaltyReward(ctx context.Context, orgID uuid.UUID, dto LoyaltyRewardDTO) (*LoyaltyReward, error) {
	active := true
	if dto.IsActive != nil {
		active = *dto.IsActive
	}
	row := &LoyaltyReward{
		OrganizationID: orgID,
		Name:           dto.Name,
		Description:    dto.Description,
		PointsRequired: dto.PointsRequired,
		RewardType:     dto.RewardType,
		RewardValue:    dto.RewardValue,
		IsActive:       active,
	}
	if err := s.repo.CreateLoyaltyReward(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateLoyaltyReward(ctx context.Context, orgID, id uuid.UUID, dto LoyaltyRewardDTO) (*LoyaltyReward, error) {
	row, err := s.GetLoyaltyReward(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Name != "" {
		row.Name = dto.Name
	}
	row.Description = dto.Description
	if dto.PointsRequired != 0 {
		row.PointsRequired = dto.PointsRequired
	}
	if dto.RewardType != "" {
		row.RewardType = dto.RewardType
	}
	if dto.RewardValue != 0 {
		row.RewardValue = dto.RewardValue
	}
	if dto.IsActive != nil {
		row.IsActive = *dto.IsActive
	}
	if err := s.repo.UpdateLoyaltyReward(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteLoyaltyReward(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetLoyaltyReward(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteLoyaltyReward(ctx, orgID, id)
}

type ReviewDTO struct {
	CustomerID uuid.UUID  `json:"customer_id"`
	StaffID    *uuid.UUID `json:"staff_id"`
	BookingID  *uuid.UUID `json:"booking_id"`
	Rating     int        `json:"rating"`
	Comment    string     `json:"comment"`
}

func (s *Service) ListReviews(ctx context.Context, orgID uuid.UUID) ([]Review, error) {
	return s.repo.ListReviews(ctx, orgID)
}

func (s *Service) GetReview(ctx context.Context, orgID, id uuid.UUID) (*Review, error) {
	return mapNotFound(s.repo.GetReview(ctx, orgID, id))
}

func (s *Service) CreateReview(ctx context.Context, orgID uuid.UUID, dto ReviewDTO) (*Review, error) {
	row := &Review{
		OrganizationID: orgID,
		CustomerID:     dto.CustomerID,
		StaffID:        dto.StaffID,
		BookingID:      dto.BookingID,
		Rating:         dto.Rating,
		Comment:        dto.Comment,
	}
	if err := s.repo.CreateReview(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateReview(ctx context.Context, orgID, id uuid.UUID, dto ReviewDTO) (*Review, error) {
	row, err := s.GetReview(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Rating != 0 {
		row.Rating = dto.Rating
	}
	row.Comment = dto.Comment
	if err := s.repo.UpdateReview(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteReview(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetReview(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteReview(ctx, orgID, id)
}

type ServicePackageDTO struct {
	BranchID        *uuid.UUID `json:"branch_id"`
	Name            string     `json:"name"`
	Description     string     `json:"description"`
	PackageType     string     `json:"package_type"`
	ServiceCategory string     `json:"service_category"`
	PriceKES        int        `json:"price_kes"`
	TotalSessions   int        `json:"total_sessions"`
	ValidDays       int        `json:"valid_days"`
	IsActive        *bool      `json:"is_active"`
}

func (s *Service) ListServicePackages(ctx context.Context, orgID uuid.UUID) ([]ServicePackage, error) {
	return s.repo.ListServicePackages(ctx, orgID)
}

func (s *Service) GetServicePackage(ctx context.Context, orgID, id uuid.UUID) (*ServicePackage, error) {
	return mapNotFound(s.repo.GetServicePackage(ctx, orgID, id))
}

func (s *Service) CreateServicePackage(ctx context.Context, orgID uuid.UUID, dto ServicePackageDTO) (*ServicePackage, error) {
	active := true
	if dto.IsActive != nil {
		active = *dto.IsActive
	}
	row := &ServicePackage{
		OrganizationID:  orgID,
		BranchID:        dto.BranchID,
		Name:            dto.Name,
		Description:     dto.Description,
		PackageType:     dto.PackageType,
		ServiceCategory: dto.ServiceCategory,
		PriceKES:        dto.PriceKES,
		TotalSessions:   dto.TotalSessions,
		ValidDays:       dto.ValidDays,
		IsActive:        active,
	}
	if row.PackageType == "" {
		row.PackageType = "sessions"
	}
	if row.TotalSessions == 0 {
		row.TotalSessions = 1
	}
	if row.ValidDays == 0 {
		row.ValidDays = 365
	}
	if err := s.repo.CreateServicePackage(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateServicePackage(ctx context.Context, orgID, id uuid.UUID, dto ServicePackageDTO) (*ServicePackage, error) {
	row, err := s.GetServicePackage(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Name != "" {
		row.Name = dto.Name
	}
	row.Description = dto.Description
	if dto.PackageType != "" {
		row.PackageType = dto.PackageType
	}
	if dto.ServiceCategory != "" {
		row.ServiceCategory = dto.ServiceCategory
	}
	if dto.PriceKES != 0 {
		row.PriceKES = dto.PriceKES
	}
	if dto.TotalSessions != 0 {
		row.TotalSessions = dto.TotalSessions
	}
	if dto.ValidDays != 0 {
		row.ValidDays = dto.ValidDays
	}
	if dto.IsActive != nil {
		row.IsActive = *dto.IsActive
	}
	if dto.BranchID != nil {
		row.BranchID = dto.BranchID
	}
	if err := s.repo.UpdateServicePackage(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteServicePackage(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetServicePackage(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteServicePackage(ctx, orgID, id)
}

type CustomerPackageDTO struct {
	BranchID     *uuid.UUID `json:"branch_id"`
	CustomerID   *uuid.UUID `json:"customer_id"`
	PackageID    *uuid.UUID `json:"package_id"`
	AmountPaid   int        `json:"amount_paid"`
	SessionsUsed int        `json:"sessions_used"`
	Status       string     `json:"status"`
	ExpiresAt    *time.Time `json:"expires_at"`
}

func (s *Service) ListCustomerPackages(ctx context.Context, orgID uuid.UUID) ([]CustomerPackage, error) {
	return s.repo.ListCustomerPackages(ctx, orgID)
}

func (s *Service) GetCustomerPackage(ctx context.Context, orgID, id uuid.UUID) (*CustomerPackage, error) {
	return mapNotFound(s.repo.GetCustomerPackage(ctx, orgID, id))
}

func (s *Service) CreateCustomerPackage(ctx context.Context, orgID uuid.UUID, dto CustomerPackageDTO) (*CustomerPackage, error) {
	row := &CustomerPackage{
		OrganizationID: orgID,
		BranchID:       dto.BranchID,
		CustomerID:     dto.CustomerID,
		PackageID:      dto.PackageID,
		AmountPaid:     dto.AmountPaid,
		SessionsUsed:   dto.SessionsUsed,
		Status:         dto.Status,
		ExpiresAt:      dto.ExpiresAt,
	}
	if row.Status == "" {
		row.Status = "active"
	}
	if err := s.repo.CreateCustomerPackage(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateCustomerPackage(ctx context.Context, orgID, id uuid.UUID, dto CustomerPackageDTO) (*CustomerPackage, error) {
	row, err := s.GetCustomerPackage(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.BranchID != nil {
		row.BranchID = dto.BranchID
	}
	if dto.CustomerID != nil {
		row.CustomerID = dto.CustomerID
	}
	if dto.PackageID != nil {
		row.PackageID = dto.PackageID
	}
	if dto.AmountPaid != 0 {
		row.AmountPaid = dto.AmountPaid
	}
	row.SessionsUsed = dto.SessionsUsed
	if dto.Status != "" {
		row.Status = dto.Status
	}
	row.ExpiresAt = dto.ExpiresAt
	if err := s.repo.UpdateCustomerPackage(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteCustomerPackage(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetCustomerPackage(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteCustomerPackage(ctx, orgID, id)
}

type GiftCardDTO struct {
	BranchID       *uuid.UUID `json:"branch_id"`
	Code           string     `json:"code"`
	InitialBalance int        `json:"initial_balance"`
	CurrentBalance int        `json:"current_balance"`
	RecipientName  string     `json:"recipient_name"`
	RecipientPhone string     `json:"recipient_phone"`
	Message        string     `json:"message"`
	IssuedBy       *uuid.UUID `json:"issued_by"`
	IsActive       *bool      `json:"is_active"`
}

func (s *Service) ListGiftCards(ctx context.Context, orgID uuid.UUID) ([]GiftCard, error) {
	return s.repo.ListGiftCards(ctx, orgID)
}

func (s *Service) GetGiftCard(ctx context.Context, orgID, id uuid.UUID) (*GiftCard, error) {
	return mapNotFound(s.repo.GetGiftCard(ctx, orgID, id))
}

func (s *Service) CreateGiftCard(ctx context.Context, orgID uuid.UUID, dto GiftCardDTO) (*GiftCard, error) {
	active := true
	if dto.IsActive != nil {
		active = *dto.IsActive
	}
	balance := dto.InitialBalance
	if dto.CurrentBalance != 0 {
		balance = dto.CurrentBalance
	}
	row := &GiftCard{
		OrganizationID: orgID,
		BranchID:       dto.BranchID,
		Code:           dto.Code,
		InitialBalance: dto.InitialBalance,
		CurrentBalance: balance,
		RecipientName:  dto.RecipientName,
		RecipientPhone: dto.RecipientPhone,
		Message:        dto.Message,
		IssuedBy:       dto.IssuedBy,
		IsActive:       active,
	}
	if err := s.repo.CreateGiftCard(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateGiftCard(ctx context.Context, orgID, id uuid.UUID, dto GiftCardDTO) (*GiftCard, error) {
	row, err := s.GetGiftCard(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Code != "" {
		row.Code = dto.Code
	}
	if dto.CurrentBalance != 0 {
		row.CurrentBalance = dto.CurrentBalance
	}
	row.RecipientName = dto.RecipientName
	row.RecipientPhone = dto.RecipientPhone
	row.Message = dto.Message
	if dto.IsActive != nil {
		row.IsActive = *dto.IsActive
	}
	if err := s.repo.UpdateGiftCard(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteGiftCard(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetGiftCard(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteGiftCard(ctx, orgID, id)
}

type GiftCardRedemptionDTO struct {
	GiftCardID       uuid.UUID  `json:"gift_card_id"`
	TransactionID    *uuid.UUID `json:"transaction_id"`
	AmountRedeemed   int        `json:"amount_redeemed"`
	RemainingBalance int        `json:"remaining_balance"`
	RedeemedBy       *uuid.UUID `json:"redeemed_by"`
}

func (s *Service) ListGiftCardRedemptions(ctx context.Context, orgID uuid.UUID) ([]GiftCardRedemption, error) {
	return s.repo.ListGiftCardRedemptions(ctx, orgID)
}

func (s *Service) GetGiftCardRedemption(ctx context.Context, orgID, id uuid.UUID) (*GiftCardRedemption, error) {
	return mapNotFound(s.repo.GetGiftCardRedemption(ctx, orgID, id))
}

func (s *Service) CreateGiftCardRedemption(ctx context.Context, orgID uuid.UUID, dto GiftCardRedemptionDTO) (*GiftCardRedemption, error) {
	row := &GiftCardRedemption{
		OrganizationID:   orgID,
		GiftCardID:       dto.GiftCardID,
		TransactionID:    dto.TransactionID,
		AmountRedeemed:   dto.AmountRedeemed,
		RemainingBalance: dto.RemainingBalance,
		RedeemedBy:       dto.RedeemedBy,
	}
	if err := s.repo.CreateGiftCardRedemption(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

type CampaignDTO struct {
	Name        string     `json:"name"`
	Channel     string     `json:"channel"`
	Status      string     `json:"status"`
	Subject     string     `json:"subject"`
	Body        string     `json:"body"`
	ScheduledAt *time.Time `json:"scheduled_at"`
	SentAt      *time.Time `json:"sent_at"`
}

func (s *Service) ListCampaigns(ctx context.Context, orgID uuid.UUID) ([]Campaign, error) {
	return s.repo.ListCampaigns(ctx, orgID)
}

func (s *Service) GetCampaign(ctx context.Context, orgID, id uuid.UUID) (*Campaign, error) {
	return mapNotFound(s.repo.GetCampaign(ctx, orgID, id))
}

func (s *Service) CreateCampaign(ctx context.Context, orgID uuid.UUID, dto CampaignDTO) (*Campaign, error) {
	row := &Campaign{
		OrganizationID: orgID,
		Name:           dto.Name,
		Channel:        dto.Channel,
		Status:         dto.Status,
		Subject:        dto.Subject,
		Body:           dto.Body,
		ScheduledAt:    dto.ScheduledAt,
		SentAt:         dto.SentAt,
	}
	if row.Channel == "" {
		row.Channel = "email"
	}
	if row.Status == "" {
		row.Status = "draft"
	}
	if err := s.repo.CreateCampaign(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateCampaign(ctx context.Context, orgID, id uuid.UUID, dto CampaignDTO) (*Campaign, error) {
	row, err := s.GetCampaign(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Name != "" {
		row.Name = dto.Name
	}
	if dto.Channel != "" {
		row.Channel = dto.Channel
	}
	if dto.Status != "" {
		row.Status = dto.Status
	}
	row.Subject = dto.Subject
	row.Body = dto.Body
	row.ScheduledAt = dto.ScheduledAt
	row.SentAt = dto.SentAt
	if err := s.repo.UpdateCampaign(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteCampaign(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetCampaign(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteCampaign(ctx, orgID, id)
}

func (s *Service) LoyaltyWallet(ctx context.Context, orgID uuid.UUID, phone string) (map[string]any, error) {
	return s.repo.CustomerByPhone(ctx, orgID, phone)
}

func (s *Service) RedeemReward(ctx context.Context, orgID, customerID, rewardID uuid.UUID) error {
	return s.repo.RedeemReward(ctx, orgID, customerID, rewardID)
}

func (s *Service) MyReferrals(ctx context.Context, orgID uuid.UUID, phone string) (map[string]any, error) {
	cust, err := s.repo.CustomerByPhone(ctx, orgID, phone)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	cid := cust["customer_id"].(uuid.UUID)
	rows, err := s.repo.ReferralsForCustomer(ctx, orgID, cid)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"referral_code": cust["referral_code"],
		"referrals":     rows,
		"total":         len(rows),
	}, nil
}

func (s *Service) MyReviews(ctx context.Context, orgID uuid.UUID, phone string) ([]Review, error) {
	cust, err := s.repo.CustomerByPhone(ctx, orgID, phone)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	cid := cust["customer_id"].(uuid.UUID)
	return s.repo.ReviewsForCustomer(ctx, orgID, cid)
}
