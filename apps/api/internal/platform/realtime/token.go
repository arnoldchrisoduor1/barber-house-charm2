package realtime

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenClaims struct {
	jwt.RegisteredClaims
	OrgID     uuid.UUID `json:"org_id"`
	Channels  []string  `json:"channels"`
	TokenType string    `json:"token_type"`
}

type TokenService struct {
	secret []byte
	ttl    time.Duration
}

func NewTokenService(secret string, ttl time.Duration) *TokenService {
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	return &TokenService{
		secret: []byte(secret),
		ttl:    ttl,
	}
}

func (s *TokenService) Issue(orgID uuid.UUID, userID uuid.UUID, channels []string) (string, time.Time, error) {
	if len(channels) == 0 {
		channels = []string{QueueChannel(orgID)}
	}
	exp := time.Now().Add(s.ttl)
	claims := TokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		OrgID:     orgID,
		Channels:  channels,
		TokenType: "realtime",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign realtime token: %w", err)
	}
	return signed, exp, nil
}

func (s *TokenService) Parse(tokenStr string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &TokenClaims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	if claims.TokenType != "realtime" {
		return nil, fmt.Errorf("invalid token type")
	}
	return claims, nil
}
