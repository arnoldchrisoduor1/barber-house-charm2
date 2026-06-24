package auth

import "time"

type RegisterRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	FullName     string `json:"fullName"`
	OrgName      string `json:"orgName"`
	OrgSlug      string `json:"orgSlug"`
	BusinessType string `json:"businessType"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type AuthResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
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
