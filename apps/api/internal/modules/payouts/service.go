package payouts

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/idempotency"
	openfloatmod "github.com/haus-of-wellness/api/internal/modules/integrations/openfloat"
)

type LedgerRecorder interface {
	RecordPayout(ctx context.Context, orgID uuid.UUID, amount int64, ref string, payoutID *uuid.UUID) error
}

type Service struct {
	repo        *Repository
	openfloat   *openfloatmod.Client
	idempotency *idempotency.Store
	ledger      LedgerRecorder
}

func NewService(repo *Repository, openfloat *openfloatmod.Client, idempotency *idempotency.Store, ledger LedgerRecorder) *Service {
	return &Service{
		repo:        repo,
		openfloat:   openfloat,
		idempotency: idempotency,
		ledger:      ledger,
	}
}

type CreatePayoutDTO struct {
	AmountKES int64  `json:"amount_kes"`
	Phone     string `json:"phone"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID) ([]Payout, error) {
	return s.repo.List(ctx, orgID)
}

func (s *Service) Request(ctx context.Context, orgID uuid.UUID, dto CreatePayoutDTO) (*Payout, error) {
	if dto.AmountKES <= 0 {
		return nil, fmt.Errorf("invalid amount")
	}

	merchantRef := fmt.Sprintf("PO-%s-%s", orgID.String()[:8], uuid.NewString()[:8])
	processed, err := s.idempotency.IsProcessed(ctx, "payout", merchantRef)
	if err != nil {
		return nil, err
	}
	if processed {
		return nil, fmt.Errorf("duplicate payout request")
	}

	acquired, err := s.idempotency.TryAcquire(ctx, "payout", merchantRef)
	if err != nil {
		return nil, err
	}
	if !acquired {
		return nil, fmt.Errorf("duplicate payout request")
	}
	fulfilled := false
	defer func() {
		if !fulfilled {
			_ = s.idempotency.Release(ctx, "payout", merchantRef)
		}
	}()

	p := &Payout{
		OrganizationID:    orgID,
		AmountKES:         dto.AmountKES,
		Status:            "pending",
		MerchantReference: merchantRef,
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}

	resp, err := s.openfloat.Disburse(ctx, openfloatmod.DisburseRequest{
		MerchantReference: merchantRef,
		AmountKES:         dto.AmountKES,
		Phone:             dto.Phone,
	})
	if err != nil {
		p.Status = "failed"
		p.FailureReason = err.Error()
		_ = s.repo.Update(ctx, orgID, p)
		return p, err
	}

	p.Status = "processing"
	p.OpenfloatRef = resp.Reference
	if err := s.repo.Update(ctx, orgID, p); err != nil {
		return nil, err
	}

	if s.ledger != nil {
		if err := s.ledger.RecordPayout(ctx, orgID, dto.AmountKES, merchantRef, &p.ID); err != nil {
			return nil, err
		}
	}

	p.Status = "completed"
	if err := s.repo.Update(ctx, orgID, p); err != nil {
		return nil, err
	}
	if err := s.idempotency.MarkDone(ctx, "payout", merchantRef); err != nil {
		return nil, err
	}
	fulfilled = true
	return p, nil
}
