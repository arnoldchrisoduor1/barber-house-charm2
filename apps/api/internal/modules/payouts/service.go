package payouts

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"

	openfloatmod "github.com/haus-of-wellness/api/internal/modules/integrations/openfloat"
	"github.com/haus-of-wellness/api/internal/platform/idempotency"
)

type LedgerRecorder interface {
	RecordPayout(ctx context.Context, orgID uuid.UUID, amount int64, ref string, payoutID *uuid.UUID) error
}

type AuditRecorder interface {
	RecordOrgAudit(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, metadata []byte) error
}

type Service struct {
	repo        *Repository
	openfloat   *openfloatmod.Client
	idempotency *idempotency.Store
	ledger      LedgerRecorder
	audit       AuditRecorder
}

func NewService(repo *Repository, openfloat *openfloatmod.Client, idempotency *idempotency.Store, ledger LedgerRecorder, audit AuditRecorder) *Service {
	return &Service{
		repo:        repo,
		openfloat:   openfloat,
		idempotency: idempotency,
		ledger:      ledger,
		audit:       audit,
	}
}

func (s *Service) recordAudit(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, action string, entityID uuid.UUID, meta map[string]any) {
	if s.audit == nil {
		return
	}
	raw, _ := json.Marshal(meta)
	_ = s.audit.RecordOrgAudit(ctx, orgID, userID, action, "payout", &entityID, raw)
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

	// Submitting to the provider is NOT the same as money having left — stay "processing"
	// until ConfirmPayout observes a real completed status. The tenant wallet is only
	// debited on confirmed completion, never on submission (see 01-security-tenancy.mdc:
	// no success theatre for money that hasn't moved).
	p.Status = "processing"
	p.OpenfloatRef = resp.Reference
	if err := s.repo.Update(ctx, orgID, p); err != nil {
		return nil, err
	}
	if err := s.idempotency.MarkDone(ctx, "payout", merchantRef); err != nil {
		return nil, err
	}
	fulfilled = true
	s.recordAudit(ctx, orgID, nil, "payout.requested", p.ID, map[string]any{
		"amount_kes": dto.AmountKES, "merchant_reference": merchantRef,
	})
	return p, nil
}

// ConfirmPayout re-queries the provider for authoritative status — never trusts a cached
// "submitted" response as final. Only on a confirmed COMPLETED status does money leave the
// tenant wallet in the ledger; a stub provider with no live credentials will report
// PROCESSING forever, which is the honest state (see B2-07).
func (s *Service) ConfirmPayout(ctx context.Context, orgID, id uuid.UUID, actorID *uuid.UUID) (*Payout, error) {
	p, err := s.repo.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if p.Status == "completed" || p.Status == "failed" {
		return p, nil
	}

	status, err := s.openfloat.GetDisbursementStatus(ctx, p.OpenfloatRef)
	if err != nil {
		return nil, err
	}

	switch status.Status {
	case "COMPLETED":
		if s.ledger != nil {
			if err := s.ledger.RecordPayout(ctx, orgID, p.AmountKES, p.MerchantReference, &p.ID); err != nil {
				return nil, err
			}
		}
		p.Status = "completed"
		if err := s.repo.Update(ctx, orgID, p); err != nil {
			return nil, err
		}
		s.recordAudit(ctx, orgID, actorID, "payout.completed", p.ID, map[string]any{
			"amount_kes": p.AmountKES, "merchant_reference": p.MerchantReference,
		})
	case "FAILED":
		p.Status = "failed"
		p.FailureReason = "provider reported failed disbursement"
		if err := s.repo.Update(ctx, orgID, p); err != nil {
			return nil, err
		}
		s.recordAudit(ctx, orgID, actorID, "payout.failed", p.ID, map[string]any{
			"merchant_reference": p.MerchantReference,
		})
	default:
		// still processing — no state change, no ledger movement
	}
	return p, nil
}
