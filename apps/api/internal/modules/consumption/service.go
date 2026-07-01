package consumption

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

type LogDTO struct {
	InventoryID *uuid.UUID `json:"inventory_id"`
	ServiceID   *uuid.UUID `json:"service_id"`
	StaffID     *uuid.UUID `json:"staff_id"`
	Quantity    int        `json:"quantity"`
	Unit        string     `json:"unit"`
	Notes       string     `json:"notes"`
	ConsumedAt  *time.Time `json:"consumed_at"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID) ([]Log, error) {
	return s.repo.List(ctx, orgID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Log, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto LogDTO) (*Log, error) {
	qty := dto.Quantity
	if qty == 0 {
		qty = 1
	}
	unit := dto.Unit
	if unit == "" {
		unit = "unit"
	}
	consumed := time.Now()
	if dto.ConsumedAt != nil {
		consumed = *dto.ConsumedAt
	}
	row := &Log{
		OrganizationID: orgID,
		InventoryID:    dto.InventoryID,
		ServiceID:      dto.ServiceID,
		StaffID:        dto.StaffID,
		Quantity:       qty,
		Unit:           unit,
		Notes:          dto.Notes,
		ConsumedAt:     consumed,
	}
	if err := s.repo.Create(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) Update(ctx context.Context, orgID, id uuid.UUID, dto LogDTO) (*Log, error) {
	row, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	row.InventoryID = dto.InventoryID
	row.ServiceID = dto.ServiceID
	row.StaffID = dto.StaffID
	if dto.Quantity != 0 {
		row.Quantity = dto.Quantity
	}
	if dto.Unit != "" {
		row.Unit = dto.Unit
	}
	row.Notes = dto.Notes
	if dto.ConsumedAt != nil {
		row.ConsumedAt = *dto.ConsumedAt
	}
	if err := s.repo.Update(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.Get(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, orgID, id)
}
