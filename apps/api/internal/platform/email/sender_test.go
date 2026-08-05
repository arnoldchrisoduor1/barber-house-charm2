package email

import (
	"log/slog"
	"testing"

	"github.com/haus-of-wellness/api/internal/platform/config"
)

func TestDeliversExternally_LogSender(t *testing.T) {
	s := NewLogSender(slog.Default())
	if DeliversExternally(s) {
		t.Fatal("LogSender must not claim external delivery")
	}
}

func TestDeliversExternally_SMTPSender(t *testing.T) {
	s := NewSMTPSender(&config.Config{SMTPHost: "smtp.example.com", SMTPPort: 587, SMTPFrom: "a@b.c"}, slog.Default())
	if !DeliversExternally(s) {
		t.Fatal("SMTPSender must claim external delivery")
	}
}

func TestNewSender_DryRunUsesLogSender(t *testing.T) {
	s := NewSender(&config.Config{EmailDryRun: true, SMTPHost: "smtp.example.com"}, slog.Default())
	if DeliversExternally(s) {
		t.Fatal("EMAIL_DRY_RUN must not deliver externally")
	}
}
