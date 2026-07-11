package auth

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	staffmod "github.com/haus-of-wellness/api/internal/modules/staff"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

func (s *Service) VerifyEmail(ctx context.Context, token string) (*AuthResponse, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, httpx.ErrUnauthorized
	}
	row, err := s.repo.FindEmailVerificationToken(ctx, token)
	if err != nil || row == nil || row.ExpiresAt.Before(time.Now()) {
		return nil, httpx.ErrUnauthorized
	}
	user, err := s.repo.FindUserByID(ctx, row.UserID)
	if err != nil {
		return nil, err
	}
	if err := s.repo.MarkEmailVerified(ctx, user.ID); err != nil {
		return nil, err
	}
	_ = s.repo.DeleteEmailVerificationTokens(ctx, user.ID)

	org, roles, err := s.tenancySvc.PrimaryMembership(ctx, user.ID)
	if err != nil {
		return s.issueTokens(ctx, user.ID, uuid.Nil, []string{"customer"})
	}
	return s.issueTokens(ctx, user.ID, org.ID, roles)
}

func (s *Service) SelectOrg(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) (*AuthResponse, error) {
	org, err := s.tenancySvc.GetOrg(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if err := s.tenancySvc.EnsureMember(ctx, userID, org.ID, "customer"); err != nil {
		return nil, err
	}
	return s.issueTokens(ctx, userID, org.ID, []string{"customer"})
}

func (s *Service) ListPublicOrgs(ctx context.Context, category string) ([]map[string]any, error) {
	return s.tenancySvc.ListPublicOrgs(ctx, category)
}

func (s *Service) LookupStaffMembership(ctx context.Context, email string) (*StaffMembershipLookupResponse, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return nil, httpx.ErrConflict
	}
	invite, err := s.repo.FindPendingStaffInviteByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if invite != nil {
		org, err := s.tenancySvc.GetOrg(ctx, invite.OrganizationID)
		if err != nil {
			return nil, err
		}
		user, _ := s.repo.FindUserByEmail(ctx, email)
		return &StaffMembershipLookupResponse{
			Email:         email,
			Organization:  org.Name,
			OrgSlug:       org.Slug,
			Role:          invite.Role,
			HasAccount:    user != nil,
			InvitePending: true,
		}, nil
	}
	user, err := s.repo.FindUserByEmail(ctx, email)
	if err != nil || user == nil {
		return nil, httpx.ErrNotFound
	}
	org, roles, err := s.tenancySvc.PrimaryMembership(ctx, user.ID)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	role := "staff"
	if len(roles) > 0 {
		role = roles[0]
	}
	return &StaffMembershipLookupResponse{
		Email:        email,
		Organization: org.Name,
		OrgSlug:      org.Slug,
		Role:         role,
		HasAccount:   true,
	}, nil
}

func (s *Service) CreateStaffInvite(ctx context.Context, orgID, invitedBy uuid.UUID, req CreateStaffInviteRequest) (*StaffInvite, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" {
		return nil, httpx.ErrConflict
	}
	role, err := resolveStaffInviteRole(req.Role)
	if err != nil {
		return nil, err
	}
	org, err := s.tenancySvc.GetOrg(ctx, orgID)
	if err != nil {
		return nil, err
	}
	token, err := generateSecureToken()
	if err != nil {
		return nil, err
	}
	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" {
		displayName = strings.Split(email, "@")[0]
	}

	var invite StaffInvite
	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		staffRow := staffmod.Staff{
			OrganizationID: orgID,
			DisplayName:    displayName,
			Email:          email,
			Role:           role,
			Specialties:    pq.StringArray{},
			IsActive:       true,
		}
		if err := tx.Create(&staffRow).Error; err != nil {
			return err
		}
		invite = StaffInvite{
			OrganizationID: orgID,
			Email:          email,
			Role:           role,
			Token:          token,
			InvitedBy:      invitedBy,
			StaffID:        &staffRow.ID,
			ExpiresAt:      time.Now().Add(7 * 24 * time.Hour),
		}
		return tx.Create(&invite).Error
	})
	if err != nil {
		return nil, err
	}
	if err := s.sendStaffInviteEmail(ctx, email, org.Name, token); err != nil {
		return nil, err
	}
	return &invite, nil
}

func (s *Service) ListStaffInvites(ctx context.Context, orgID uuid.UUID) ([]StaffInvite, error) {
	return s.repo.ListStaffInvites(ctx, orgID)
}

func (s *Service) AcceptInvite(ctx context.Context, req AcceptInviteRequest) (*AuthResponse, error) {
	token := strings.TrimSpace(req.Token)
	if token == "" || req.Password == "" {
		return nil, httpx.ErrConflict
	}
	invite, err := s.repo.FindStaffInviteByToken(ctx, token)
	if err != nil || invite == nil || invite.AcceptedAt != nil || invite.ExpiresAt.Before(time.Now()) {
		return nil, httpx.ErrUnauthorized
	}
	org, err := s.tenancySvc.GetOrg(ctx, invite.OrganizationID)
	if err != nil {
		return nil, err
	}

	user, err := s.repo.FindUserByEmail(ctx, invite.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		hash, err := platformauth.HashPassword(req.Password)
		if err != nil {
			return nil, err
		}
		fullName := strings.TrimSpace(req.FullName)
		if fullName == "" {
			fullName = strings.Split(invite.Email, "@")[0]
		}
		err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			user = &User{Email: invite.Email, PasswordHash: hash}
			now := time.Now()
			user.EmailVerifiedAt = &now
			if err := tx.Create(user).Error; err != nil {
				return err
			}
			if err := tx.Create(&Profile{UserID: user.ID, FullName: fullName}).Error; err != nil {
				return err
			}
			member := tenancymod.OrganizationMember{OrganizationID: org.ID, UserID: user.ID}
			if err := tx.Create(&member).Error; err != nil {
				return err
			}
			role := tenancymod.UserRole{OrganizationID: org.ID, UserID: user.ID, Role: invite.Role}
			if err := tx.Create(&role).Error; err != nil {
				return err
			}
			if invite.StaffID != nil {
				if err := tx.Table("staff").Where("id = ?", *invite.StaffID).Update("user_id", user.ID).Error; err != nil {
					return err
				}
			}
			return tx.Model(&StaffInvite{}).Where("id = ?", invite.ID).Update("accepted_at", now).Error
		})
		if err != nil {
			return nil, fmt.Errorf("accept invite: %w", err)
		}
	} else {
		if user.EmailVerifiedAt == nil {
			_ = s.repo.MarkEmailVerified(ctx, user.ID)
		}
		if err := s.tenancySvc.EnsureMember(ctx, user.ID, org.ID, invite.Role); err != nil {
			return nil, err
		}
		if invite.StaffID != nil {
			_ = s.repo.LinkStaffUser(ctx, *invite.StaffID, user.ID)
		}
		_ = s.repo.MarkStaffInviteAccepted(ctx, invite.ID)
	}

	return s.issueTokens(ctx, user.ID, org.ID, []string{invite.Role})
}

func (s *Service) PreviewStaffInvite(ctx context.Context, token string) (map[string]any, error) {
	invite, err := s.repo.FindStaffInviteByToken(ctx, strings.TrimSpace(token))
	if err != nil || invite == nil || invite.AcceptedAt != nil || invite.ExpiresAt.Before(time.Now()) {
		return nil, httpx.ErrNotFound
	}
	org, err := s.tenancySvc.GetOrg(ctx, invite.OrganizationID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"email":        invite.Email,
		"role":         invite.Role,
		"organization": org.Name,
		"orgSlug":      org.Slug,
	}, nil
}
