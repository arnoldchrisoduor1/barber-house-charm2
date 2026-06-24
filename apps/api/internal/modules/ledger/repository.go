package ledger

import (
	"context"
	"fmt"

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

func (r *Repository) List(ctx context.Context, orgID uuid.UUID) ([]LedgerEntry, error) {
	var rows []LedgerEntry
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) AppendBalanced(ctx context.Context, orgID uuid.UUID, debit, credit LedgerEntry) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if debit.AmountKES != credit.AmountKES {
			return fmt.Errorf("unbalanced ledger entry")
		}
		if debit.Ref != "" && debit.Ref == credit.Ref {
			var existing int64
			if err := tx.Model(&LedgerEntry{}).Scopes(platformtenancy.OrgScope(orgID)).
				Where("ref = ?", debit.Ref).Count(&existing).Error; err != nil {
				return err
			}
			if existing > 0 {
				return nil
			}
		}
		debit.OrganizationID = orgID
		credit.OrganizationID = orgID
		if err := tx.Create(&debit).Error; err != nil {
			return err
		}
		if err := tx.Create(&credit).Error; err != nil {
			return err
		}
		return adjustTenantWalletCache(tx, orgID, debit, credit)
	})
}

func adjustTenantWalletCache(tx *gorm.DB, orgID uuid.UUID, debit, credit LedgerEntry) error {
	var delta int64
	if debit.Account == "tenant_wallet" {
		if debit.Direction == "debit" {
			delta -= debit.AmountKES
		} else {
			delta += debit.AmountKES
		}
	}
	if credit.Account == "tenant_wallet" {
		if credit.Direction == "credit" {
			delta += credit.AmountKES
		} else {
			delta -= credit.AmountKES
		}
	}
	if delta == 0 {
		return nil
	}
	return tx.Exec(`
		INSERT INTO tenant_wallets (id, organization_id, balance_kes, reserve_kes, currency, created_at, updated_at)
		VALUES (gen_random_uuid(), ?, ?, 0, 'KES', NOW(), NOW())
		ON CONFLICT (organization_id) DO UPDATE
		SET balance_kes = tenant_wallets.balance_kes + EXCLUDED.balance_kes, updated_at = NOW()
	`, orgID, delta).Error
}

func (r *Repository) WalletBalance(ctx context.Context, orgID uuid.UUID) (int64, error) {
	type result struct {
		Debits  int64
		Credits int64
	}
	var res result
	err := r.db.WithContext(ctx).Model(&LedgerEntry{}).Scopes(platformtenancy.OrgScope(orgID)).
		Select(`
			COALESCE(SUM(CASE WHEN direction = 'debit' AND account = 'tenant_wallet' THEN amount_kes ELSE 0 END), 0) AS debits,
			COALESCE(SUM(CASE WHEN direction = 'credit' AND account = 'tenant_wallet' THEN amount_kes ELSE 0 END), 0) AS credits
		`).Scan(&res).Error
	if err != nil {
		return 0, err
	}
	return res.Credits - res.Debits, nil
}
