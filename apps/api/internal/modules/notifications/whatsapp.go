package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/haus-of-wellness/api/internal/platform/config"
)

type MetaWhatsApp struct {
	token     string
	phoneID   string
	dryRun    bool
	logger    *slog.Logger
	client    *http.Client
}

func NewMetaWhatsApp(cfg *config.Config, logger *slog.Logger) *MetaWhatsApp {
	if logger == nil {
		logger = slog.Default()
	}
	dryRun := cfg.WhatsAppDryRun || cfg.MetaWhatsAppToken == "" || cfg.MetaWhatsAppPhoneID == ""
	return &MetaWhatsApp{
		token:   cfg.MetaWhatsAppToken,
		phoneID: cfg.MetaWhatsAppPhoneID,
		dryRun:  dryRun,
		logger:  logger,
		client:  &http.Client{Timeout: 20 * time.Second},
	}
}

func (m *MetaWhatsApp) DeliversExternally() bool { return !m.dryRun }

func (m *MetaWhatsApp) SendWhatsApp(ctx context.Context, req WhatsAppRequest) (string, error) {
	if m.dryRun {
		ref := fmt.Sprintf("wa-dry-run-%s", req.TemplateName)
		m.logger.InfoContext(ctx, "whatsapp_send_dry_run",
			"provider", "meta",
			"to_masked", maskPhone(req.To),
			"template", req.TemplateName,
			"ref", ref,
			"delivered_externally", false,
		)
		return ref, nil
	}
	payload := map[string]any{
		"messaging_product": "whatsapp",
		"to":                strings.TrimPrefix(req.To, "+"),
		"type":              "text",
		"text":              map[string]string{"body": req.Body},
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	url := fmt.Sprintf("https://graph.facebook.com/v19.0/%s/messages", m.phoneID)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+m.token)

	res, err := m.client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return "", fmt.Errorf("meta_whatsapp status %d: %s", res.StatusCode, strings.TrimSpace(string(body)))
	}
	ref := fmt.Sprintf("meta-%d", res.StatusCode)
	m.logger.InfoContext(ctx, "whatsapp_send",
		"provider", "meta",
		"to_masked", maskPhone(req.To),
		"template", req.TemplateName,
		"ref", ref,
		"delivered_externally", true,
	)
	return ref, nil
}
