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

func (s *Service) UpdateBranch(ctx context.Context, orgID, branchID uuid.UUID, name, address, phone string, isActive *bool) (*Branch, error) {
	b, err := s.repo.GetBranch(ctx, orgID, branchID)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	if name != "" {
		b.Name = name
	}
	b.Address = address
	b.Phone = phone
	if isActive != nil {
		b.IsActive = *isActive
	}
	if err := s.repo.UpdateBranch(ctx, orgID, b); err != nil {
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

func (s *Service) UpdateSpecialty(ctx context.Context, orgID uuid.UUID, specialty string) (*Organization, error) {
	org, err := s.repo.FindOrgByID(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if org.BusinessType != "mobile" && org.BusinessType != "solo_pro" {
		return nil, httpx.ErrConflict
	}
	valid := map[string]bool{
		"barber": true, "beauty": true, "spa": true, "nail_bar": true,
		"clinic": true, "therapy": true, "products": true,
	}
	if specialty != "" && !valid[specialty] {
		return nil, httpx.ErrConflict
	}
	var ptr *string
	if specialty != "" {
		ptr = &specialty
	}
	if err := s.repo.UpdateSpecialty(ctx, orgID, ptr); err != nil {
		return nil, err
	}
	org.Specialty = ptr
	return org, nil
}

func (s *Service) ListRoles(ctx context.Context, userID, orgID uuid.UUID) ([]string, error) {
	return s.repo.ListRoles(ctx, userID, orgID)
}

func (s *Service) IsMember(ctx context.Context, userID, orgID uuid.UUID) (bool, error) {
	return s.repo.IsMember(ctx, userID, orgID)
}

func (s *Service) Membership(ctx context.Context, userID, orgID uuid.UUID) (*Organization, []string, error) {
	ok, err := s.repo.IsMember(ctx, userID, orgID)
	if err != nil {
		return nil, nil, err
	}
	if !ok {
		return nil, nil, httpx.ErrForbidden
	}
	org, err := s.repo.FindOrgByID(ctx, orgID)
	if err != nil {
		return nil, nil, err
	}
	roles, err := s.repo.ListRoles(ctx, userID, orgID)
	if err != nil {
		return nil, nil, err
	}
	if len(roles) == 0 {
		return nil, nil, httpx.ErrForbidden
	}
	return org, roles, nil
}

func (s *Service) FindBySlug(ctx context.Context, slug string) (*Organization, error) {
	return s.repo.FindOrgBySlug(ctx, slug)
}

func (s *Service) ListPublicOrgs(ctx context.Context, category string) ([]map[string]any, error) {
	return s.repo.ListPublicOrgs(ctx, category)
}

func (s *Service) EnsureMember(ctx context.Context, userID, orgID uuid.UUID, role string) error {
	return s.repo.EnsureMember(ctx, userID, orgID, role)
}
