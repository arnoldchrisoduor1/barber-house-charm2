package notifications

import (
	"context"
	"fmt"
	"log/slog"
)

type MetaWhatsApp struct {
	logger *slog.Logger
}

func NewMetaWhatsApp(logger *slog.Logger) *MetaWhatsApp {
	if logger == nil {
		logger = slog.Default()
	}
	return &MetaWhatsApp{logger: logger}
}

func (m *MetaWhatsApp) SendWhatsApp(ctx context.Context, req WhatsAppRequest) (string, error) {
	ref := fmt.Sprintf("meta-stub-%s", req.TemplateName)
	m.logger.InfoContext(ctx, "whatsapp_send_stub",
		"provider", "meta",
		"to_masked", maskPhone(req.To),
		"template", req.TemplateName,
		"ref", ref,
	)
	return ref, nil
}
