package notifications

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/haus-of-wellness/api/internal/platform/config"
)

type AfricasTalkingSMS struct {
	username string
	apiKey   string
	dryRun   bool
	logger   *slog.Logger
	client   *http.Client
}

func NewAfricasTalkingSMS(cfg *config.Config, logger *slog.Logger) *AfricasTalkingSMS {
	if logger == nil {
		logger = slog.Default()
	}
	dryRun := cfg.SMSDryRun || cfg.AfricasTalkingAPIKey == "" || cfg.AfricasTalkingUsername == ""
	return &AfricasTalkingSMS{
		username: cfg.AfricasTalkingUsername,
		apiKey:   cfg.AfricasTalkingAPIKey,
		dryRun:   dryRun,
		logger:   logger,
		client:   &http.Client{Timeout: 20 * time.Second},
	}
}

func (a *AfricasTalkingSMS) DeliversExternally() bool { return !a.dryRun }

func (a *AfricasTalkingSMS) SendSMS(ctx context.Context, req SMSRequest) (string, error) {
	if a.dryRun {
		ref := fmt.Sprintf("sms-dry-run-%d", len(req.Message))
		a.logger.InfoContext(ctx, "sms_send_dry_run",
			"provider", "africas_talking",
			"to_masked", maskPhone(req.To),
			"ref", ref,
			"delivered_externally", false,
		)
		return ref, nil
	}
	form := url.Values{}
	form.Set("username", a.username)
	form.Set("to", req.To)
	form.Set("message", req.Message)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.africastalking.com/version1/messaging", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("apiKey", a.apiKey)
	httpReq.Header.Set("Accept", "application/json")

	res, err := a.client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return "", fmt.Errorf("africas_talking status %d: %s", res.StatusCode, strings.TrimSpace(string(body)))
	}
	ref := fmt.Sprintf("at-%d", res.StatusCode)
	a.logger.InfoContext(ctx, "sms_send",
		"provider", "africas_talking",
		"to_masked", maskPhone(req.To),
		"ref", ref,
		"delivered_externally", true,
	)
	return ref, nil
}

func maskPhone(phone string) string {
	if len(phone) <= 4 {
		return "****"
	}
	return "****" + phone[len(phone)-4:]
}
