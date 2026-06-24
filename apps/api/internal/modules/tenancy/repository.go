package tenancy

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindOrgBySlug(ctx context.Context, slug string) (*Organization, error) {
	var org Organization
	err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&org).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return &org, err
}

func (r *Repository) FindOrgByIDOrSlug(ctx context.Context, idOrSlug string) (*Organization, error) {
	if id, err := uuid.Parse(idOrSlug); err == nil {
		var org Organization
		err := r.db.WithContext(ctx).Where("id = ?", id).First(&org).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, httpx.ErrNotFound
		}
		return &org, err
	}
	return r.FindOrgBySlug(ctx, idOrSlug)
}

func (r *Repository) IsMember(ctx context.Context, userID, orgID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&OrganizationMember{}).
		Where("user_id = ? AND organization_id = ? AND is_active = true", userID, orgID).
		Count(&count).Error
	return count > 0, err
}

func (r *Repository) ListRoles(ctx context.Context, userID, orgID uuid.UUID) ([]string, error) {
	var roles []UserRole
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND organization_id = ?", userID, orgID).
		Find(&roles).Error
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(roles))
	for _, role := range roles {
		out = append(out, role.Role)
	}
	return out, nil
}

func (r *Repository) PrimaryOrg(ctx context.Context, userID uuid.UUID) (*Organization, error) {
	var org Organization
	err := r.db.WithContext(ctx).
		Table("organizations").
		Joins("JOIN organization_members om ON om.organization_id = organizations.id").
		Where("om.user_id = ? AND om.is_active = true", userID).
		Order("om.joined_at ASC").
		First(&org).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return &org, err
}

func (r *Repository) GetSubscription(ctx context.Context, orgID uuid.UUID) (*Subscription, error) {
	var sub Subscription
	err := r.db.WithContext(ctx).Where("organization_id = ?", orgID).First(&sub).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &Subscription{OrganizationID: orgID, Plan: "starter", Status: "trial"}, nil
	}
	return &sub, err
}

func (r *Repository) ListBranches(ctx context.Context, orgID uuid.UUID) ([]Branch, error) {
	var branches []Branch
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Find(&branches).Error
	return branches, err
}

func (r *Repository) CreateBranch(ctx context.Context, branch *Branch) error {
	return r.db.WithContext(ctx).Create(branch).Error
}

func (r *Repository) ListMembers(ctx context.Context, orgID uuid.UUID) ([]OrganizationMember, error) {
	var members []OrganizationMember
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Find(&members).Error
	return members, err
}

func (r *Repository) FindOrgByID(ctx context.Context, orgID uuid.UUID) (*Organization, error) {
	var org Organization
	err := r.db.WithContext(ctx).First(&org, "id = ?", orgID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return &org, err
}
