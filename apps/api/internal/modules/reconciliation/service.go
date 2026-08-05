package reconciliation

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type AuditRecorder interface {
	RecordOrgAudit(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, metadata []byte) error
}

type Service struct {
	repo  *Repository
	audit AuditRecorder
}

func NewService(repo *Repository, audit AuditRecorder) *Service {
	return &Service{repo: repo, audit: audit}
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Run, error) {
	return s.repo.List(ctx, orgID, branchID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Run, error) {
	return s.repo.Get(ctx, orgID, id)
}

// Today returns (creating if needed) the open cash-up run for the given branch, with
// expected totals freshly recomputed from completed transactions — never stale.
func (s *Service) Today(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) (*Run, error) {
	today := time.Now()
	existing, err := s.repo.FindOpenForDate(ctx, orgID, branchID, today)
	if err != nil {
		return nil, fmt.Errorf("find open run: %w", err)
	}
	cashKES, cardKES, err := s.repo.ExpectedTotals(ctx, orgID, branchID, today)
	if err != nil {
		return nil, fmt.Errorf("expected totals: %w", err)
	}
	if existing != nil {
		if existing.Status == StatusOpen {
			existing.ExpectedCashKES = cashKES
			existing.ExpectedCardKES = cardKES
			if err := s.repo.Save(ctx, orgID, existing); err != nil {
				return nil, err
			}
		}
		return existing, nil
	}
	row := &Run{
		OrganizationID:  orgID,
		BranchID:        branchID,
		RunDate:         today,
		ExpectedCashKES: cashKES,
		ExpectedCardKES: cardKES,
		Status:          StatusOpen,
	}
	if err := s.repo.Create(ctx, row); err != nil {
		return nil, fmt.Errorf("create run: %w", err)
	}
	return row, nil
}

type CloseDTO struct {
	CountedCashKES int64  `json:"counted_cash_kes"`
	CountedCardKES int64  `json:"counted_card_kes"`
	Notes          string `json:"notes"`
}

// Close records the operator's counted till amounts and computes variance server-side —
// the operator never enters variance directly.
func (s *Service) Close(ctx context.Context, orgID, id uuid.UUID, actorID *uuid.UUID, dto CloseDTO) (*Run, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if row.Status == StatusClosed {
		return row, nil
	}
	cash := dto.CountedCashKES
	card := dto.CountedCardKES
	variance := (cash + card) - (row.ExpectedCashKES + row.ExpectedCardKES)
	now := time.Now()
	row.CountedCashKES = &cash
	row.CountedCardKES = &card
	row.VarianceKES = &variance
	row.Status = StatusClosed
	row.Notes = dto.Notes
	row.ClosedByUserID = actorID
	row.ClosedAt = &now
	if err := s.repo.Save(ctx, orgID, row); err != nil {
		return nil, err
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{
			"expected_cash_kes": row.ExpectedCashKES, "expected_card_kes": row.ExpectedCardKES,
			"counted_cash_kes": cash, "counted_card_kes": card, "variance_kes": variance,
		})
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "reconciliation.closed", "reconciliation_run", &row.ID, meta)
	}
	return row, nil
}
