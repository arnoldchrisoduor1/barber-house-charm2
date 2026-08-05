package crm

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (r *Repository) MergeCustomers(ctx context.Context, orgID, primaryID uuid.UUID, mergeIDs []uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var primary Customer
		if err := tx.Scopes(platformtenancy.OrgScope(orgID)).
			Where("id = ? AND merged_into_id IS NULL", primaryID).
			First(&primary).Error; err != nil {
			return err
		}

		for _, sourceID := range mergeIDs {
			if sourceID == primaryID {
				continue
			}
			var source Customer
			if err := tx.Scopes(platformtenancy.OrgScope(orgID)).
				Where("id = ? AND merged_into_id IS NULL", sourceID).
				First(&source).Error; err != nil {
				return err
			}

			updates := map[string]any{"customer_id": primaryID}
			for _, table := range []string{
				"bookings", "transactions", "booking_deposits", "waitlist",
				"customer_packages", "reviews", "loyalty_transactions",
			} {
				if err := tx.Table(table).Scopes(platformtenancy.OrgScope(orgID)).
					Where("customer_id = ?", sourceID).
					Updates(updates).Error; err != nil {
					return err
				}
			}
			_ = tx.Table("referrals").Scopes(platformtenancy.OrgScope(orgID)).
				Where("referrer_customer_id = ?", sourceID).
				Update("referrer_customer_id", primaryID)
			_ = tx.Table("referrals").Scopes(platformtenancy.OrgScope(orgID)).
				Where("referred_customer_id = ?", sourceID).
				Update("referred_customer_id", primaryID)

			if err := tx.Table("customer_photos").Scopes(platformtenancy.OrgScope(orgID)).
				Where("customer_id = ?", sourceID).
				Update("customer_id", primaryID).Error; err != nil {
				return err
			}

			var tagIDs []uuid.UUID
			_ = tx.Table("customer_tag_links").Scopes(platformtenancy.OrgScope(orgID)).
				Where("customer_id = ?", sourceID).
				Pluck("tag_id", &tagIDs)
			for _, tagID := range tagIDs {
				_ = tx.Exec(
					`INSERT INTO customer_tag_links (organization_id, customer_id, tag_id)
					 VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
					orgID, primaryID, tagID,
				)
			}
			_ = tx.Table("customer_tag_links").Scopes(platformtenancy.OrgScope(orgID)).
				Where("customer_id = ?", sourceID).Delete(nil)

			primary.TotalVisits += source.TotalVisits
			primary.TotalSpent += source.TotalSpent
			primary.LoyaltyPoints += source.LoyaltyPoints
			if primary.Email == "" && source.Email != "" {
				primary.Email = source.Email
			}
			if primary.Notes == "" && source.Notes != "" {
				primary.Notes = source.Notes
			}

			if err := tx.Model(&source).Updates(map[string]any{
				"merged_into_id": primaryID,
				"total_visits":   0,
				"total_spent":    0,
				"loyalty_points": 0,
			}).Error; err != nil {
				return err
			}
		}

		return tx.Save(&primary).Error
	})
}

func (r *Repository) ListTags(ctx context.Context, orgID uuid.UUID) ([]CustomerTag, error) {
	var rows []CustomerTag
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) CreateTag(ctx context.Context, tag *CustomerTag) error {
	return r.db.WithContext(ctx).Create(tag).Error
}

func (r *Repository) DeleteTag(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&CustomerTag{}, "id = ?", id).Error
}

func (r *Repository) SetCustomerTags(ctx context.Context, orgID, customerID uuid.UUID, tagIDs []uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Table("customer_tag_links").Scopes(platformtenancy.OrgScope(orgID)).
			Where("customer_id = ?", customerID).Delete(nil).Error; err != nil {
			return err
		}
		for _, tagID := range tagIDs {
			if err := tx.Exec(
				`INSERT INTO customer_tag_links (organization_id, customer_id, tag_id) VALUES (?, ?, ?)`,
				orgID, customerID, tagID,
			).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *Repository) ListCustomerPhotos(ctx context.Context, orgID, customerID uuid.UUID) ([]CustomerPhoto, error) {
	var rows []CustomerPhoto
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("customer_id = ?", customerID).Order("taken_at DESC, created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) CreateCustomerPhoto(ctx context.Context, row *CustomerPhoto) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) DeleteCustomerPhoto(ctx context.Context, orgID, customerID, photoID uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("customer_id = ? AND id = ?", customerID, photoID).
		Delete(&CustomerPhoto{}).Error
}
