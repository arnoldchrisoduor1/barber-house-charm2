package crm

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

type CreateCustomerDTO struct {
	FullName         string     `json:"full_name"`
	Phone            string     `json:"phone"`
	Email            string     `json:"email"`
	Notes            string     `json:"notes"`
	StylePreferences string     `json:"style_preferences"`
	LoyaltyTier      string     `json:"loyalty_tier"`
	AssignedStaffID  *uuid.UUID `json:"assigned_staff_id"`
	BranchID         *uuid.UUID `json:"branch_id"`
}

type UpdateCustomerDTO struct {
	FullName         *string    `json:"full_name"`
	Phone            *string    `json:"phone"`
	Email            *string    `json:"email"`
	Notes            *string    `json:"notes"`
	StylePreferences *string    `json:"style_preferences"`
	LoyaltyTier      *string    `json:"loyalty_tier"`
	LoyaltyPoints    *int       `json:"loyalty_points"`
	TotalVisits      *int       `json:"total_visits"`
	TotalSpent       *int       `json:"total_spent"`
	LastVisitAt      *time.Time `json:"last_visit_at"`
	AssignedStaffID  *uuid.UUID `json:"assigned_staff_id"`
	BranchID         *uuid.UUID `json:"branch_id"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Customer, error) {
	return s.repo.List(ctx, orgID, branchID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Customer, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto CreateCustomerDTO) (*Customer, error) {
	tier := dto.LoyaltyTier
	if tier == "" {
		tier = "bronze"
	}
	c := &Customer{
		OrganizationID:   orgID,
		FullName:         dto.FullName,
		Phone:            dto.Phone,
		Email:            dto.Email,
		Notes:            dto.Notes,
		StylePreferences: dto.StylePreferences,
		LoyaltyTier:      tier,
		AssignedStaffID:  dto.AssignedStaffID,
		BranchID:         dto.BranchID,
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	_ = s.repo.ensureReferralCode(ctx, orgID, c.ID)
	return c, nil
}

func (s *Service) Update(ctx context.Context, orgID, id uuid.UUID, dto UpdateCustomerDTO) (*Customer, error) {
	c, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.FullName != nil {
		c.FullName = *dto.FullName
	}
	if dto.Phone != nil {
		c.Phone = *dto.Phone
	}
	if dto.Email != nil {
		c.Email = *dto.Email
	}
	if dto.Notes != nil {
		c.Notes = *dto.Notes
	}
	if dto.StylePreferences != nil {
		c.StylePreferences = *dto.StylePreferences
	}
	if dto.LoyaltyTier != nil {
		c.LoyaltyTier = *dto.LoyaltyTier
	}
	if dto.LoyaltyPoints != nil {
		c.LoyaltyPoints = *dto.LoyaltyPoints
	}
	if dto.TotalVisits != nil {
		c.TotalVisits = *dto.TotalVisits
	}
	if dto.TotalSpent != nil {
		c.TotalSpent = *dto.TotalSpent
	}
	if dto.LastVisitAt != nil {
		c.LastVisitAt = dto.LastVisitAt
	}
	if dto.AssignedStaffID != nil {
		c.AssignedStaffID = dto.AssignedStaffID
	}
	if dto.BranchID != nil {
		c.BranchID = dto.BranchID
	}
	if err := s.repo.Update(ctx, orgID, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Service) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.Get(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, orgID, id)
}

func (s *Service) ListOwnership(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID) ([]Customer, error) {
	if staffID != nil {
		return s.repo.ListByStaff(ctx, orgID, *staffID)
	}
	return s.repo.ListOwnership(ctx, orgID)
}
