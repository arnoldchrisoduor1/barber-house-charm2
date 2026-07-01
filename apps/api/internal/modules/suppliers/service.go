package suppliers

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

type SupplierDTO struct {
	Name        string `json:"name"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	Notes       string `json:"notes"`
	IsActive    *bool  `json:"is_active"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID) ([]Supplier, error) {
	return s.repo.List(ctx, orgID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Supplier, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto SupplierDTO) (*Supplier, error) {
	row := &Supplier{
		OrganizationID: orgID,
		Name:           dto.Name,
		ContactName:    dto.ContactName,
		Phone:          dto.Phone,
		Email:          dto.Email,
		Address:        dto.Address,
		Notes:          dto.Notes,
		IsActive:       true,
	}
	if err := s.repo.Create(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) Update(ctx context.Context, orgID, id uuid.UUID, dto SupplierDTO) (*Supplier, error) {
	row, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Name != "" {
		row.Name = dto.Name
	}
	row.ContactName = dto.ContactName
	row.Phone = dto.Phone
	row.Email = dto.Email
	row.Address = dto.Address
	row.Notes = dto.Notes
	if dto.IsActive != nil {
		row.IsActive = *dto.IsActive
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
