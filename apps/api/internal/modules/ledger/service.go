package ledger

import (
	"context"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
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

func (s *Service) RecordPayout(ctx context.Context, orgID uuid.UUID, amount int64, ref string, payoutID *uuid.UUID) error {
	debit := LedgerEntry{
		Account:  "tenant_wallet",
		Direction: "debit",
		AmountKES: amount,
		PayoutID:  payoutID,
		Ref:       ref,
	}
	credit := LedgerEntry{
		Account:  "payout_clearing",
		Direction: "credit",
		AmountKES: amount,
		PayoutID:  payoutID,
		Ref:       ref,
	}
	return s.repo.AppendBalanced(ctx, orgID, debit, credit)
}
