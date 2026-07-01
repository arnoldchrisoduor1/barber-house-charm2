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


type AuthResponse struct {
	AccessToken    string `json:"accessToken,omitempty"`
	RefreshToken   string `json:"refreshToken,omitempty"`
	ExpiresIn      int64  `json:"expiresIn,omitempty"`
	Requires2FA    bool   `json:"requires2FA,omitempty"`
	ChallengeToken string `json:"challengeToken,omitempty"`
}

type MeResponse struct {
	User         UserDTO         `json:"user"`
	ActiveOrg    OrgSummaryDTO   `json:"activeOrg"`
	Roles        []string        `json:"roles"`
	Subscription SubscriptionDTO `json:"subscription"`
	Features     []string        `json:"features"`
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
