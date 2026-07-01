package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"

	platformemail "github.com/haus-of-wellness/api/internal/platform/email"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

const (
	otpTTL           = 10 * time.Minute
	setupKeyPrefix   = "2fa:setup:"
	loginKeyPrefix   = "2fa:login:"
)

type TwoFactorService struct {
	repo   *Repository
	redis  *goredis.Client
	email  platformemail.Sender
}

func NewTwoFactorService(repo *Repository, redis *goredis.Client, email platformemail.Sender) *TwoFactorService {
	return &TwoFactorService{repo: repo, redis: redis, email: email}
}

func generateOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (t *TwoFactorService) IsEnabled(ctx context.Context, userID uuid.UUID) (bool, error) {
	row, err := t.repo.FindTwoFactor(ctx, userID)
	if err != nil || row == nil {
		return false, err
	}
	return row.IsEnabled, nil
}

func (t *TwoFactorService) Setup(ctx context.Context, userID uuid.UUID, emailAddr string) error {
	otp, err := generateOTP()
	if err != nil {
		return err
	}
	if err := t.redis.Set(ctx, setupKeyPrefix+userID.String(), otp, otpTTL).Err(); err != nil {
		return err
	}
	if t.email != nil {
		return t.email.Send(ctx, platformemail.Message{
			To:      emailAddr,
			Subject: "Haus of Wellness — 2FA setup code",
			Body:    fmt.Sprintf("Your verification code is %s. It expires in 10 minutes.", otp),
		})
	}
	return nil
}

func (t *TwoFactorService) VerifySetup(ctx context.Context, userID uuid.UUID, otp string) error {
	stored, err := t.redis.Get(ctx, setupKeyPrefix+userID.String()).Result()
	if err != nil {
		return httpx.ErrUnauthorized
	}
	if stored != otp {
		return httpx.ErrUnauthorized
	}
	_ = t.redis.Del(ctx, setupKeyPrefix+userID.String()).Err()
	now := time.Now()
	return t.repo.UpsertTwoFactor(ctx, &UserTwoFactor{
		UserID:    userID,
		IsEnabled: true,
		EnabledAt: &now,
	})
}

func (t *TwoFactorService) Disable(ctx context.Context, userID uuid.UUID, otp string) error {
	if err := t.verifySetupOTP(ctx, userID, otp); err != nil {
		return err
	}
	return t.repo.DisableTwoFactor(ctx, userID)
}

func (t *TwoFactorService) verifySetupOTP(ctx context.Context, userID uuid.UUID, otp string) error {
	stored, err := t.redis.Get(ctx, setupKeyPrefix+userID.String()).Result()
	if err == nil && stored == otp {
		_ = t.redis.Del(ctx, setupKeyPrefix+userID.String()).Err()
		return nil
	}
	challengeStored, err := t.redis.Get(ctx, loginKeyPrefix+userID.String()).Result()
	if err != nil || challengeStored != otp {
		return httpx.ErrUnauthorized
	}
	return nil
}

type LoginChallenge struct {
	ChallengeToken string `json:"challengeToken"`
	Requires2FA    bool   `json:"requires2FA"`
}

func (t *TwoFactorService) BeginLoginChallenge(ctx context.Context, userID uuid.UUID, emailAddr string) (*LoginChallenge, error) {
	token := uuid.NewString()
	otp, err := generateOTP()
	if err != nil {
		return nil, err
	}
	if err := t.redis.Set(ctx, loginKeyPrefix+hashToken(token), userID.String(), otpTTL).Err(); err != nil {
		return nil, err
	}
	if err := t.redis.Set(ctx, loginKeyPrefix+userID.String(), otp, otpTTL).Err(); err != nil {
		return nil, err
	}
	if t.email != nil {
		if err := t.email.Send(ctx, platformemail.Message{
			To:      emailAddr,
			Subject: "Haus of Wellness — login verification code",
			Body:    fmt.Sprintf("Your login code is %s. It expires in 10 minutes.", otp),
		}); err != nil {
			return nil, err
		}
	}
	return &LoginChallenge{ChallengeToken: token, Requires2FA: true}, nil
}

func (t *TwoFactorService) CompleteLoginChallenge(ctx context.Context, challengeToken, otp string) (uuid.UUID, error) {
	userIDStr, err := t.redis.Get(ctx, loginKeyPrefix+hashToken(challengeToken)).Result()
	if err != nil {
		return uuid.Nil, httpx.ErrUnauthorized
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, httpx.ErrUnauthorized
	}
	stored, err := t.redis.Get(ctx, loginKeyPrefix+userID.String()).Result()
	if err != nil || stored != otp {
		return uuid.Nil, httpx.ErrUnauthorized
	}
	_ = t.redis.Del(ctx, loginKeyPrefix+hashToken(challengeToken)).Err()
	_ = t.redis.Del(ctx, loginKeyPrefix+userID.String()).Err()
	return userID, nil
}
