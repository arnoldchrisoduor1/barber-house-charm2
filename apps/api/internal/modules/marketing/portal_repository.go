package marketing

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type LoyaltyTransaction struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrganizationID uuid.UUID `gorm:"type:uuid;not null;index"`
	CustomerID     uuid.UUID `gorm:"type:uuid;not null"`
	Points         int       `gorm:"not null"`
	TxnType        string    `gorm:"column:txn_type;not null;default:earn"`
	RefID          *uuid.UUID
	Description    string
	CreatedAt      string `gorm:"->"`
}

func (LoyaltyTransaction) TableName() string { return "loyalty_transactions" }

func (r *Repository) CustomerByPhone(ctx context.Context, orgID uuid.UUID, phone string) (map[string]any, error) {
	var row struct {
		ID            uuid.UUID
		FullName      string
		Phone         string
		LoyaltyPoints int
		LoyaltyTier   string
		ReferralCode  *string
	}
	err := r.db.WithContext(ctx).Table("customers").
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("phone = ?", phone).
		Select("id, full_name, phone, loyalty_points, loyalty_tier::text, referral_code").
		Scan(&row).Error
	if err != nil || row.ID == uuid.Nil {
		return nil, gorm.ErrRecordNotFound
	}
	return map[string]any{
		"customer_id":    row.ID,
		"full_name":      row.FullName,
		"phone":          row.Phone,
		"loyalty_points": row.LoyaltyPoints,
		"loyalty_tier":   row.LoyaltyTier,
		"referral_code":  row.ReferralCode,
	}, nil
}

func (r *Repository) ReferralsForCustomer(ctx context.Context, orgID, customerID uuid.UUID) ([]Referral, error) {
	var rows []Referral
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("referrer_customer_id = ?", customerID).
		Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) ReviewsForCustomer(ctx context.Context, orgID, customerID uuid.UUID) ([]Review, error) {
	var rows []Review
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("customer_id = ?", customerID).
		Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) RedeemReward(ctx context.Context, orgID, customerID, rewardID uuid.UUID) error {
	var reward LoyaltyReward
	if err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&reward, "id = ?", rewardID).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var points int
		if err := tx.Table("customers").Scopes(platformtenancy.OrgScope(orgID)).
			Where("id = ?", customerID).Select("loyalty_points").Scan(&points).Error; err != nil {
			return err
		}
		if points < reward.PointsRequired {
			return gorm.ErrInvalidTransaction
		}
		if err := tx.Exec(`UPDATE customers SET loyalty_points = loyalty_points - ? WHERE id = ? AND organization_id = ?`,
			reward.PointsRequired, customerID, orgID).Error; err != nil {
			return err
		}
		return tx.Exec(`INSERT INTO loyalty_transactions (organization_id, customer_id, points, txn_type, ref_id, description)
			VALUES (?, ?, ?, 'redeem', ?, ?)`, orgID, customerID, -reward.PointsRequired, rewardID, reward.Name).Error
	})
}
