package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type ServiceLayer struct {
	repo *Repository
}

func NewService(repo *Repository) *ServiceLayer {
	return &ServiceLayer{repo: repo}
}

type CreateServiceDTO struct {
	Name            string     `json:"name"`
	Category        string     `json:"category"`
	PriceKES        int        `json:"price_kes"`
	DurationMinutes int        `json:"duration_minutes"`
	Description     string     `json:"description"`
	ImageURL        string     `json:"image_url"`
	IsActive        *bool      `json:"is_active"`
	BranchID        *uuid.UUID `json:"branch_id"`
}

type UpdateServiceDTO struct {
	Name            *string    `json:"name"`
	Category        *string    `json:"category"`
	PriceKES        *int       `json:"price_kes"`
	DurationMinutes *int       `json:"duration_minutes"`
	Description     *string    `json:"description"`
	ImageURL        *string    `json:"image_url"`
	IsActive        *bool      `json:"is_active"`
	BranchID        *uuid.UUID `json:"branch_id"`
}

func (s *ServiceLayer) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Service, error) {
	return s.repo.List(ctx, orgID, branchID)
}

func (s *ServiceLayer) Get(ctx context.Context, orgID, id uuid.UUID) (*Service, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *ServiceLayer) Create(ctx context.Context, orgID uuid.UUID, dto CreateServiceDTO) (*Service, error) {
	active := true
	if dto.IsActive != nil {
		active = *dto.IsActive
	}
	duration := dto.DurationMinutes
	if duration == 0 {
		duration = 30
	}
	row := &Service{
		OrganizationID:  orgID,
		BranchID:        dto.BranchID,
		Name:            dto.Name,
		Category:        dto.Category,
		PriceKES:        dto.PriceKES,
		DurationMinutes: duration,
		Description:     dto.Description,
		ImageURL:        dto.ImageURL,
		IsActive:        active,
	}
	if err := s.repo.Create(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *ServiceLayer) Update(ctx context.Context, orgID, id uuid.UUID, dto UpdateServiceDTO) (*Service, error) {
	row, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Name != nil {
		row.Name = *dto.Name
	}
	if dto.Category != nil {
		row.Category = *dto.Category
	}
	if dto.PriceKES != nil {
		row.PriceKES = *dto.PriceKES
	}
	if dto.DurationMinutes != nil {
		row.DurationMinutes = *dto.DurationMinutes
	}
	if dto.Description != nil {
		row.Description = *dto.Description
	}
	if dto.ImageURL != nil {
		row.ImageURL = *dto.ImageURL
	}
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

func (s *ServiceLayer) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.Get(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, orgID, id)
}
