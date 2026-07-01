package email

import (
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"

	"github.com/haus-of-wellness/api/internal/platform/config"
)

type Message struct {
	To      string
	Subject string
	Body    string
}

type Sender interface {
	Send(ctx context.Context, msg Message) error
}

type LogSender struct {
	Logger *slog.Logger
}

func NewLogSender(logger *slog.Logger) *LogSender {
	if logger == nil {
		logger = slog.Default()
	}
	return &LogSender{Logger: logger}
}

func (s *LogSender) Send(ctx context.Context, msg Message) error {
	s.Logger.InfoContext(ctx, "email_send",
		"to", redactEmail(msg.To),
		"subject", msg.Subject,
		"body_len", len(msg.Body),
	)
	return nil
}

type SMTPSender struct {
	host   string
	port   int
	from   string
	logger *slog.Logger
}

func NewSMTPSender(cfg *config.Config, logger *slog.Logger) *SMTPSender {
	if logger == nil {
		logger = slog.Default()
	}
	return &SMTPSender{
		host:   cfg.SMTPHost,
		port:   cfg.SMTPPort,
		from:   cfg.SMTPFrom,
		logger: logger,
	}
}

func (s *SMTPSender) Send(ctx context.Context, msg Message) error {
	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	body := strings.Builder{}
	body.WriteString(fmt.Sprintf("From: %s\r\n", s.from))
	body.WriteString(fmt.Sprintf("To: %s\r\n", msg.To))
	body.WriteString(fmt.Sprintf("Subject: %s\r\n", msg.Subject))
	body.WriteString("MIME-Version: 1.0\r\n")
	body.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	body.WriteString("\r\n")
	body.WriteString(msg.Body)

	if err := smtp.SendMail(addr, nil, s.from, []string{msg.To}, []byte(body.String())); err != nil {
		s.logger.ErrorContext(ctx, "email_send_failed",
			"to", redactEmail(msg.To),
			"subject", msg.Subject,
			"error", err,
		)
		return err
	}

	s.logger.InfoContext(ctx, "email_send",
		"to", redactEmail(msg.To),
		"subject", msg.Subject,
		"transport", "smtp",
	)
	return nil
}

func NewSender(cfg *config.Config, logger *slog.Logger) Sender {
	if cfg != nil && cfg.SMTPHost != "" {
		return NewSMTPSender(cfg, logger)
	}
	return NewLogSender(logger)
}

func redactEmail(email string) string {
	if len(email) < 4 {
		return "***"
	}
	return fmt.Sprintf("%s***", email[:2])
}
