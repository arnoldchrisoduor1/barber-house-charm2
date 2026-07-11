package email

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"net"
	"net/smtp"
	"strings"

	"github.com/haus-of-wellness/api/internal/platform/config"
)

type Message struct {
	To      string
	Subject string
	Body    string
	HTML    string
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
	host      string
	port      int
	from      string
	fromName  string
	user      string
	password  string
	startTLS  bool
	logger    *slog.Logger
}

func NewSMTPSender(cfg *config.Config, logger *slog.Logger) *SMTPSender {
	if logger == nil {
		logger = slog.Default()
	}
	from := cfg.SMTPFrom
	if from == "" {
		from = cfg.SMTPUser
	}
	return &SMTPSender{
		host:     cfg.SMTPHost,
		port:     cfg.SMTPPort,
		from:     from,
		fromName: cfg.EmailFromName,
		user:     cfg.SMTPUser,
		password: cfg.SMTPPassword,
		startTLS: cfg.SMTPStartTLS,
		logger:   logger,
	}
}

func (s *SMTPSender) Send(ctx context.Context, msg Message) error {
	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	fromHeader := s.from
	if s.fromName != "" {
		fromHeader = fmt.Sprintf("%s <%s>", s.fromName, s.from)
	}

	body := strings.Builder{}
	body.WriteString(fmt.Sprintf("From: %s\r\n", fromHeader))
	body.WriteString(fmt.Sprintf("To: %s\r\n", msg.To))
	body.WriteString(fmt.Sprintf("Subject: %s\r\n", msg.Subject))
	body.WriteString("MIME-Version: 1.0\r\n")
	if msg.HTML != "" {
		body.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
		body.WriteString("\r\n")
		body.WriteString(msg.HTML)
	} else {
		body.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		body.WriteString("\r\n")
		body.WriteString(msg.Body)
	}

	var auth smtp.Auth
	if s.user != "" && s.password != "" {
		auth = smtp.PlainAuth("", s.user, s.password, s.host)
	}

	var err error
	if s.startTLS {
		err = sendMailStartTLS(addr, auth, s.from, []string{msg.To}, []byte(body.String()), s.host)
	} else {
		err = smtp.SendMail(addr, auth, s.from, []string{msg.To}, []byte(body.String()))
	}
	if err != nil {
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

func sendMailStartTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte, host string) error {
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: host}); err != nil {
			return err
		}
	}
	if auth != nil {
		if ok, _ := client.Extension("AUTH"); ok {
			if err := client.Auth(auth); err != nil {
				return err
			}
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	for _, rcpt := range to {
		if err := client.Rcpt(rcpt); err != nil {
			return err
		}
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func NewSender(cfg *config.Config, logger *slog.Logger) Sender {
	if cfg != nil && cfg.EmailDryRun {
		return NewLogSender(logger)
	}
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
