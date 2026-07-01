package tenancy

import (
	"context"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) UserBelongsToOrg(ctx context.Context, userID uuid.UUID, orgRef string) (uuid.UUID, error) {
	org, err := s.repo.FindOrgByIDOrSlug(ctx, orgRef)
	if err != nil {
		return uuid.Nil, err
	}
	ok, err := s.repo.IsMember(ctx, userID, org.ID)
	if err != nil {
		return uuid.Nil, err
	}
	if !ok {
		return uuid.Nil, httpx.ErrForbidden
	}
	return org.ID, nil
}

func (s *Service) PrimaryMembership(ctx context.Context, userID uuid.UUID) (*Organization, []string, error) {
	org, err := s.repo.PrimaryOrg(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	roles, err := s.repo.ListRoles(ctx, userID, org.ID)
	if err != nil {
		return nil, nil, err
	}
	return org, roles, nil
}

func (s *Service) GetSubscription(ctx context.Context, orgID uuid.UUID) (*Subscription, error) {
	return s.repo.GetSubscription(ctx, orgID)
}

func (s *Service) UpdateSubscriptionPlan(ctx context.Context, orgID uuid.UUID, plan string) (*Subscription, error) {
	return s.repo.UpdateSubscriptionPlan(ctx, orgID, plan)
}

func (s *Service) ListBranches(ctx context.Context, orgID uuid.UUID) ([]Branch, error) {
	return s.repo.ListBranches(ctx, orgID)
}

func (s *Service) CreateBranch(ctx context.Context, orgID uuid.UUID, name, address, phone string) (*Branch, error) {
	b := &Branch{
		OrganizationID: orgID,
		Name:           name,
		Address:        address,
		Phone:          phone,
		IsActive:       true,
	}
	if err := s.repo.CreateBranch(ctx, b); err != nil {
		return nil, err
	}
	return b, nil
}

func (s *Service) ListMembers(ctx context.Context, orgID uuid.UUID) ([]OrganizationMember, error) {
	return s.repo.ListMembers(ctx, orgID)
}

func (s *Service) GetOrg(ctx context.Context, orgID uuid.UUID) (*Organization, error) {
	return s.repo.FindOrgByID(ctx, orgID)
}

func (s *Service) FindBySlug(ctx context.Context, slug string) (*Organization, error) {
	return s.repo.FindOrgBySlug(ctx, slug)
}
