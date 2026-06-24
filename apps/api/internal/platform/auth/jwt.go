package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	jwt.RegisteredClaims
	ActiveOrg uuid.UUID `json:"active_org,omitempty"`
	Roles     []string  `json:"roles,omitempty"`
	TokenType string    `json:"token_type"`
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
}

type JWTService struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewJWTService(accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *JWTService {
	return &JWTService{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

func (s *JWTService) IssueAccess(userID uuid.UUID, activeOrg uuid.UUID, roles []string) (string, time.Time, error) {
	exp := time.Now().Add(s.accessTTL)
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		ActiveOrg: activeOrg,
		Roles:     roles,
		TokenType: "access",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.accessSecret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign access token: %w", err)
	}
	return signed, exp, nil
}

func (s *JWTService) IssueRefresh(userID uuid.UUID) (string, time.Time, error) {
	exp := time.Now().Add(s.refreshTTL)
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		TokenType: "refresh",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.refreshSecret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign refresh token: %w", err)
	}
	return signed, exp, nil
}

func (s *JWTService) ParseAccess(tokenStr string) (*Claims, error) {
	return s.parse(tokenStr, s.accessSecret, "access")
}

func (s *JWTService) ParseRefresh(tokenStr string) (*Claims, error) {
	return s.parse(tokenStr, s.refreshSecret, "refresh")
}

func (s *JWTService) parse(tokenStr string, secret []byte, wantType string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	if claims.TokenType != wantType {
		return nil, fmt.Errorf("invalid token type")
	}
	return claims, nil
}
