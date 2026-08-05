package resources

import (
	"context"
	"errors"

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

type ResourceDTO struct {
	Name         string     `json:"name"`
	ResourceType string     `json:"resource_type"`
	Capacity     int        `json:"capacity"`
	Status       string     `json:"status"`
	Notes        string     `json:"notes"`
	BranchID     *uuid.UUID `json:"branch_id"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Resource, error) {
	return s.repo.List(ctx, orgID, branchID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Resource, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto ResourceDTO) (*Resource, error) {
	if dto.Name == "" {
		return nil, httpx.ErrConflict
	}
	resourceType := dto.ResourceType
	if resourceType == "" {
		resourceType = "room"
	}
	status := dto.Status
	if status == "" {
		status = "available"
	}
	capacity := dto.Capacity
	if capacity <= 0 {
		capacity = 1
	}
	row := &Resource{
		OrganizationID: orgID,
		BranchID:       dto.BranchID,
		Name:           dto.Name,
		ResourceType:   resourceType,
		Capacity:       capacity,
		Status:         status,
		Notes:          dto.Notes,
	}
	if err := s.repo.Create(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) Update(ctx context.Context, orgID, id uuid.UUID, dto ResourceDTO) (*Resource, error) {
	row, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Name != "" {
		row.Name = dto.Name
	}
	if dto.ResourceType != "" {
		row.ResourceType = dto.ResourceType
	}
	if dto.Capacity > 0 {
		row.Capacity = dto.Capacity
	}
	if dto.Status != "" {
		row.Status = dto.Status
	}
	row.Notes = dto.Notes
	if dto.BranchID != nil {
		row.BranchID = dto.BranchID
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
