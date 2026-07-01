package retail

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

type ProductDTO struct {
	SKU          string     `json:"sku"`
	Name         string     `json:"name"`
	Category     string     `json:"category"`
	Description  string     `json:"description"`
	CostKES      int        `json:"cost_kes"`
	PriceKES     int        `json:"price_kes"`
	Quantity     int        `json:"quantity"`
	ReorderLevel int        `json:"reorder_level"`
	ImageURL     string     `json:"image_url"`
	IsActive     *bool      `json:"is_active"`
	BranchID     *uuid.UUID `json:"branch_id"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Product, error) {
	return s.repo.List(ctx, orgID, branchID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Product, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto ProductDTO) (*Product, error) {
	active := true
	if dto.IsActive != nil {
		active = *dto.IsActive
	}
	row := &Product{
		OrganizationID: orgID,
		BranchID:       dto.BranchID,
		SKU:            dto.SKU,
		Name:           dto.Name,
		Category:       dto.Category,
		Description:    dto.Description,
		CostKES:        dto.CostKES,
		PriceKES:       dto.PriceKES,
		Quantity:       dto.Quantity,
		ReorderLevel:   dto.ReorderLevel,
		ImageURL:       dto.ImageURL,
		IsActive:       active,
	}
	if err := s.repo.Create(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) Update(ctx context.Context, orgID, id uuid.UUID, dto ProductDTO) (*Product, error) {
	row, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.SKU != "" {
		row.SKU = dto.SKU
	}
	if dto.Name != "" {
		row.Name = dto.Name
	}
	if dto.Category != "" {
		row.Category = dto.Category
	}
	row.Description = dto.Description
	if dto.CostKES != 0 {
		row.CostKES = dto.CostKES
	}
	if dto.PriceKES != 0 {
		row.PriceKES = dto.PriceKES
	}
	row.Quantity = dto.Quantity
	row.ReorderLevel = dto.ReorderLevel
	row.ImageURL = dto.ImageURL
	if dto.IsActive != nil {
		row.IsActive = *dto.IsActive
	}
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
