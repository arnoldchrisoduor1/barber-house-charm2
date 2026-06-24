package staff

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

type CreateStaffDTO struct {
	DisplayName string     `json:"display_name"`
	Title       string     `json:"title"`
	BranchID    *uuid.UUID `json:"branch_id"`
	UserID      *uuid.UUID `json:"user_id"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID) ([]Staff, error) {
	return s.repo.List(ctx, orgID)
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto CreateStaffDTO) (*Staff, error) {
	m := &Staff{
		OrganizationID: orgID,
		UserID:         dto.UserID,
		BranchID:       dto.BranchID,
		DisplayName:    dto.DisplayName,
		Title:          dto.Title,
		IsActive:       true,
	}
	if err := s.repo.Create(ctx, m); err != nil {
		return nil, err
	}
	return m, nil
}
