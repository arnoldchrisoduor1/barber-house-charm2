package auth

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	platformmod "github.com/haus-of-wellness/api/internal/modules/platform"
)

type Service struct {
	repo       *Repository
	jwt        *platformauth.JWTService
	tenancySvc *tenancymod.Service
	features   *featuremod.Service
	platform   *platformmod.Service
	twoFactor  *TwoFactorService
}

func NewService(
	repo *Repository,
	jwt *platformauth.JWTService,
	tenancySvc *tenancymod.Service,
	features *featuremod.Service,
	platform *platformmod.Service,
	twoFactor *TwoFactorService,
) *Service {
	return &Service{repo: repo, jwt: jwt, tenancySvc: tenancySvc, features: features, platform: platform, twoFactor: twoFactor}
}

func slugifyOrgName(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 48 {
		s = s[:48]
	}
	if s == "" {
		s = "org"
	}
	return s
}

func (s *Service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.OrgSlug == "" {
		req.OrgSlug = slugifyOrgName(req.OrgName)
	}
	if req.Email == "" || req.Password == "" || req.OrgName == "" || req.OrgSlug == "" {
		return nil, httpx.ErrConflict
	}

	registerRole, err := resolveRegisterRole(req.Role)
	if err != nil {
		return nil, err
	}

	existing, err := s.repo.FindUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, httpx.ErrConflict
	}

	hash, err := platformauth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	var user User
	var org tenancymod.Organization

	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		user = User{Email: req.Email, PasswordHash: hash}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		profile := Profile{UserID: user.ID, FullName: req.FullName}
		if err := tx.Create(&profile).Error; err != nil {
			return err
		}

		businessType := req.BusinessType
		if businessType == "" {
			businessType = "barber"
		}
		org = tenancymod.Organization{
			Name:         req.OrgName,
			Slug:         req.OrgSlug,
			BusinessType: businessType,
		}
		if err := tx.Create(&org).Error; err != nil {
			return err
		}

		member := tenancymod.OrganizationMember{OrganizationID: org.ID, UserID: user.ID}
		if err := tx.Create(&member).Error; err != nil {
			return err
		}
		role := tenancymod.UserRole{OrganizationID: org.ID, UserID: user.ID, Role: registerRole}
		if err := tx.Create(&role).Error; err != nil {
			return err
		}
		trialEnds := time.Now().Add(7 * 24 * time.Hour)
		sub := tenancymod.Subscription{
			OrganizationID: org.ID,
			Plan:           "starter",
			Status:         "trial",
			TrialEndsAt:    &trialEnds,
		}
		if err := tx.Create(&sub).Error; err != nil {
			return err
		}
		wallet := tenancymod.TenantWallet{OrganizationID: org.ID}
		return tx.Create(&wallet).Error
	})
	if err != nil {
		return nil, fmt.Errorf("register bootstrap: %w", err)
	}

	return s.issueTokens(ctx, user.ID, org.ID, []string{registerRole})
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	user, err := s.repo.FindUserByEmail(ctx, req.Email)
	if err != nil || user == nil {
		return nil, httpx.ErrUnauthorized
	}
	ok, err := platformauth.VerifyPassword(user.PasswordHash, req.Password)
	if err != nil || !ok {
		return nil, httpx.ErrUnauthorized
	}

	if s.twoFactor != nil {
		enabled, err := s.twoFactor.IsEnabled(ctx, user.ID)
		if err != nil {
			return nil, err
		}
		if enabled {
			challenge, err := s.twoFactor.BeginLoginChallenge(ctx, user.ID, user.Email)
			if err != nil {
				return nil, err
			}
			return &AuthResponse{
				Requires2FA:    true,
				ChallengeToken: challenge.ChallengeToken,
			}, nil
		}
	}

	org, roles, err := s.tenancySvc.PrimaryMembership(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	return s.issueTokens(ctx, user.ID, org.ID, roles)
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (*AuthResponse, error) {
	claims, err := s.jwt.ParseRefresh(refreshToken)
	if err != nil {
		return nil, httpx.ErrUnauthorized
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return nil, httpx.ErrUnauthorized
	}
	org, roles, err := s.tenancySvc.PrimaryMembership(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.issueTokens(ctx, userID, org.ID, roles)
}

func (s *Service) Logout(_ context.Context) error {
	return nil
}

func (s *Service) Me(ctx context.Context, userID uuid.UUID) (*MeResponse, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	profile, err := s.repo.FindProfile(ctx, userID)
	if err != nil {
		return nil, err
	}
	org, roles, err := s.tenancySvc.PrimaryMembership(ctx, userID)
	if err != nil {
		return nil, err
	}
	sub, err := s.tenancySvc.GetSubscription(ctx, org.ID)
	if err != nil {
		return nil, err
	}
	features, err := s.features.EffectiveFeatures(ctx, org.ID)
	if err != nil {
		return nil, err
	}

	if s.platform != nil {
		if ok, err := s.platform.IsPlatformAdmin(ctx, userID); err == nil && ok {
			roles = append(roles, "platform_admin")
		}
	}

	sid, _ := s.repo.StaffIDForUser(ctx, org.ID, userID)
	return &MeResponse{
		User: UserDTO{
			ID:       user.ID.String(),
			Email:    user.Email,
			FullName: profile.FullName,
		},
		ActiveOrg: OrgSummaryDTO{
			ID:           org.ID.String(),
			Name:         org.Name,
			Slug:         org.Slug,
			BusinessType: org.BusinessType,
		},
		Roles: roles,
		Subscription: SubscriptionDTO{
			Plan:         sub.Plan,
			Status:       sub.Status,
			BusinessType: org.BusinessType,
			TrialEndsAt:  sub.TrialEndsAt,
		},
		Features: features,
		StaffID:  staffIDString(sid),
	}, nil
}

func staffIDString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	s := id.String()
	return &s
}

func (s *Service) Complete2FAChallenge(ctx context.Context, challengeToken, otp string) (*AuthResponse, error) {
	if s.twoFactor == nil {
		return nil, httpx.ErrUnauthorized
	}
	userID, err := s.twoFactor.CompleteLoginChallenge(ctx, challengeToken, otp)
	if err != nil {
		return nil, err
	}
	org, roles, err := s.tenancySvc.PrimaryMembership(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.issueTokens(ctx, userID, org.ID, roles)
}

func (s *Service) Setup2FA(ctx context.Context, userID uuid.UUID) error {
	if s.twoFactor == nil {
		return httpx.ErrForbidden
	}
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return err
	}
	return s.twoFactor.Setup(ctx, userID, user.Email)
}

func (s *Service) Verify2FA(ctx context.Context, userID uuid.UUID, otp string) error {
	if s.twoFactor == nil {
		return httpx.ErrForbidden
	}
	return s.twoFactor.VerifySetup(ctx, userID, otp)
}

func (s *Service) Disable2FA(ctx context.Context, userID uuid.UUID, otp string) error {
	if s.twoFactor == nil {
		return httpx.ErrForbidden
	}
	return s.twoFactor.Disable(ctx, userID, otp)
}

func (s *Service) TwoFactorStatus(ctx context.Context, userID uuid.UUID) (bool, error) {
	if s.twoFactor == nil {
		return false, nil
	}
	return s.twoFactor.IsEnabled(ctx, userID)
}

func (s *Service) issueTokens(_ context.Context, userID, orgID uuid.UUID, roles []string) (*AuthResponse, error) {
	access, exp, err := s.jwt.IssueAccess(userID, orgID, roles)
	if err != nil {
		return nil, err
	}
	refresh, _, err := s.jwt.IssueRefresh(userID)
	if err != nil {
		return nil, err
	}
	return &AuthResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int64(time.Until(exp).Seconds()),
	}, nil
}

func (s *Service) ChangePassword(ctx context.Context, userID uuid.UUID, req ChangePasswordRequest) error {
	if req.CurrentPassword == "" || req.NewPassword == "" {
		return httpx.ErrConflict
	}
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return err
	}
	ok, err := platformauth.VerifyPassword(user.PasswordHash, req.CurrentPassword)
	if err != nil || !ok {
		return httpx.ErrUnauthorized
	}
	hash, err := platformauth.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}
	user.PasswordHash = hash
	return s.repo.DB().WithContext(ctx).Save(user).Error
}
