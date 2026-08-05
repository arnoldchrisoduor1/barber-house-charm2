package ledger

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"

	platformmod "github.com/haus-of-wellness/api/internal/modules/platform"
	"github.com/haus-of-wellness/api/internal/platform/storage"
)

type Service struct {
	repo    *Repository
	audit   *platformmod.Service
	storage *storage.Client
}

func NewService(repo *Repository, audit *platformmod.Service, storageClient *storage.Client) *Service {
	return &Service{repo: repo, audit: audit, storage: storageClient}
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID) ([]LedgerEntry, error) {
	return s.repo.List(ctx, orgID)
}

func (s *Service) Balance(ctx context.Context, orgID uuid.UUID) (map[string]any, error) {
	balance, err := s.repo.WalletBalance(ctx, orgID)
	if err != nil {
		return nil, err
	}
	return map[string]any{"balanceKes": balance}, nil
}

func (s *Service) RecordCollection(ctx context.Context, orgID uuid.UUID, amount int64, ref string, txID *uuid.UUID) error {
	debit := LedgerEntry{
		Account:       "platform_clearing",
		Direction:     "debit",
		AmountKES:     amount,
		TransactionID: txID,
		Ref:           ref,
	}
	credit := LedgerEntry{
		Account:       "tenant_wallet",
		Direction:     "credit",
		AmountKES:     amount,
		TransactionID: txID,
		Ref:           ref,
	}
	return s.repo.AppendBalanced(ctx, orgID, debit, credit)
}

// RecordTip credits the tenant wallet for a collected tip (POS or manual).
func (s *Service) RecordTip(ctx context.Context, orgID uuid.UUID, amount int64, ref string, tipID *uuid.UUID) error {
	if amount <= 0 {
		return nil
	}
	debit := LedgerEntry{
		Account:   "platform_clearing",
		Direction: "debit",
		AmountKES: amount,
		Ref:       ref,
	}
	credit := LedgerEntry{
		Account:   "tenant_wallet",
		Direction: "credit",
		AmountKES: amount,
		Ref:       ref,
	}
	return s.repo.AppendBalanced(ctx, orgID, debit, credit)
}

func (s *Service) RecordPayout(ctx context.Context, orgID uuid.UUID, amount int64, ref string, payoutID *uuid.UUID) error {
	debit := LedgerEntry{
		Account:   "tenant_wallet",
		Direction: "debit",
		AmountKES: amount,
		PayoutID:  payoutID,
		Ref:       ref,
	}
	credit := LedgerEntry{
		Account:   "payout_clearing",
		Direction: "credit",
		AmountKES: amount,
		PayoutID:  payoutID,
		Ref:       ref,
	}
	return s.repo.AppendBalanced(ctx, orgID, debit, credit)
}

// RecordRentCharge debits tenant wallet when a chair renter pays monthly seat rent.
func (s *Service) RecordRentCharge(ctx context.Context, orgID uuid.UUID, amount int64, ref string) error {
	if amount <= 0 {
		return nil
	}
	debit := LedgerEntry{
		Account:   "tenant_wallet",
		Direction: "debit",
		AmountKES: amount,
		Ref:       ref,
	}
	credit := LedgerEntry{
		Account:   "rental_income",
		Direction: "credit",
		AmountKES: amount,
		Ref:       ref,
	}
	return s.repo.AppendBalanced(ctx, orgID, debit, credit)
}

func (s *Service) recordOrgAudit(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, meta map[string]any) {
	if s.audit == nil {
		return
	}
	raw, _ := json.Marshal(meta)
	_ = s.audit.RecordOrgAudit(ctx, orgID, userID, action, entityType, entityID, raw)
}
