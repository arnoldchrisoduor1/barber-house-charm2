package notifications

import (
	"log/slog"

	"github.com/haus-of-wellness/api/internal/platform/config"
)

func NewConfiguredNotifier(cfg *config.Config, logger *slog.Logger) Notifier {
	return &MultiNotifier{
		SMS:      NewAfricasTalkingSMS(cfg, logger),
		WhatsApp: NewMetaWhatsApp(cfg, logger),
	}
}

func (m *MultiNotifier) DeliversExternally() bool {
	smsLive := false
	if d, ok := m.SMS.(DeliveryAware); ok && d.DeliversExternally() {
		smsLive = true
	}
	waLive := false
	if d, ok := m.WhatsApp.(DeliveryAware); ok && d.DeliversExternally() {
		waLive = true
	}
	return smsLive || waLive
}
