package crm

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

type CreateCustomerDTO struct {
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Notes    string `json:"notes"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID) ([]Customer, error) {
	return s.repo.List(ctx, orgID)
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto CreateCustomerDTO) (*Customer, error) {
	c := &Customer{
		OrganizationID: orgID,
		FullName:       dto.FullName,
		Phone:          dto.Phone,
		Email:          dto.Email,
		Notes:          dto.Notes,
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}
