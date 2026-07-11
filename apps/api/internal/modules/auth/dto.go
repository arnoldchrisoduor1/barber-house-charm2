package auth

import "time"

type RegisterRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	FullName     string `json:"fullName"`
	OrgName      string `json:"orgName"`
	OrgSlug      string `json:"orgSlug"`
	BusinessType string `json:"businessType"`
	Role         string `json:"role"`
	AccountType  string `json:"accountType"`
}

type VerifyEmailRequest struct {
	Token string `json:"token"`
}

type AcceptInviteRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
}

type SelectOrgRequest struct {
	OrgID string `json:"orgId"`
}

type CreateStaffInviteRequest struct {
	Email       string `json:"email"`
	Role        string `json:"role"`
	DisplayName string `json:"displayName"`
}

type StaffMembershipLookupResponse struct {
	Email        string `json:"email"`
	Organization string `json:"organization"`
	OrgSlug      string `json:"orgSlug"`
	Role         string `json:"role"`
	HasAccount   bool   `json:"hasAccount"`
	InvitePending bool  `json:"invitePending"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type TwoFAOTPRequest struct {
	OTP string `json:"otp"`
}

type TwoFAChallengeRequest struct {
	ChallengeToken string `json:"challengeToken"`
	OTP            string `json:"otp"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}


type AuthResponse struct {
	AccessToken           string `json:"accessToken,omitempty"`
	RefreshToken          string `json:"refreshToken,omitempty"`
	ExpiresIn             int64  `json:"expiresIn,omitempty"`
	Requires2FA           bool   `json:"requires2FA,omitempty"`
	ChallengeToken        string `json:"challengeToken,omitempty"`
	RequiresVerification  bool   `json:"requiresVerification,omitempty"`
	Email                 string `json:"email,omitempty"`
}

type MeResponse struct {
	User         UserDTO         `json:"user"`
	ActiveOrg    OrgSummaryDTO   `json:"activeOrg"`
	Roles        []string        `json:"roles"`
	Subscription SubscriptionDTO `json:"subscription"`
	Features     []string        `json:"features"`
	StaffID      *string         `json:"staffId,omitempty"`
}

type UserDTO struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"fullName"`
}

type OrgSummaryDTO struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	BusinessType string `json:"businessType"`
}

type SubscriptionDTO struct {
	Plan         string     `json:"plan"`
	Status       string     `json:"status"`
	BusinessType string     `json:"businessType,omitempty"`
	TrialEndsAt  *time.Time `json:"trialEndsAt,omitempty"`
}
