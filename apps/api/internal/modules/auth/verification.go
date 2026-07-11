package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	platformemail "github.com/haus-of-wellness/api/internal/platform/email"
)

func generateSecureToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func (s *Service) sendVerificationEmail(ctx context.Context, userID uuid.UUID, emailAddr string) error {
	token, err := generateSecureToken()
	if err != nil {
		return err
	}
	row := &EmailVerificationToken{
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	if err := s.repo.CreateEmailVerificationToken(ctx, row); err != nil {
		return err
	}
	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", strings.TrimRight(s.publicWebURL, "/"), token)
	subject := "Haus of Wellness — verify your email"
	body := fmt.Sprintf("Welcome! Verify your account by opening this link:\n\n%s\n\nThis link expires in 24 hours.", verifyURL)
	html := fmt.Sprintf(`<p>Welcome! Verify your account by clicking the link below:</p><p><a href="%s">Verify my email</a></p><p>This link expires in 24 hours.</p>`, verifyURL)
	if s.email == nil {
		return nil
	}
	return s.email.Send(ctx, platformemail.Message{
		To:      emailAddr,
		Subject: subject,
		Body:    body,
		HTML:    html,
	})
}

func (s *Service) sendStaffInviteEmail(ctx context.Context, emailAddr, orgName, token string) error {
	acceptURL := fmt.Sprintf("%s/accept-invite?token=%s", strings.TrimRight(s.publicWebURL, "/"), token)
	subject := fmt.Sprintf("You're invited to join %s on Haus of Wellness", orgName)
	body := fmt.Sprintf("You have been invited to join %s.\n\nAccept your invite:\n%s\n\nThis link expires in 7 days.", orgName, acceptURL)
	html := fmt.Sprintf(`<p>You have been invited to join <strong>%s</strong>.</p><p><a href="%s">Accept invite</a></p><p>This link expires in 7 days.</p>`, orgName, acceptURL)
	if s.email == nil {
		return nil
	}
	return s.email.Send(ctx, platformemail.Message{
		To:      emailAddr,
		Subject: subject,
		Body:    body,
		HTML:    html,
	})
}
