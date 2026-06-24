package notifications

import "context"

type SMSRequest struct {
	To      string
	Message string
}

type WhatsAppRequest struct {
	To           string
	TemplateName string
	Body         string
}

type SMSNotifier interface {
	SendSMS(ctx context.Context, req SMSRequest) (externalRef string, err error)
}

type WhatsAppNotifier interface {
	SendWhatsApp(ctx context.Context, req WhatsAppRequest) (externalRef string, err error)
}

type Notifier interface {
	SMSNotifier
	WhatsAppNotifier
}

type MultiNotifier struct {
	SMS      SMSNotifier
	WhatsApp WhatsAppNotifier
}

func (m *MultiNotifier) SendSMS(ctx context.Context, req SMSRequest) (string, error) {
	if m.SMS == nil {
		return "", nil
	}
	return m.SMS.SendSMS(ctx, req)
}

func (m *MultiNotifier) SendWhatsApp(ctx context.Context, req WhatsAppRequest) (string, error) {
	if m.WhatsApp == nil {
		return "", nil
	}
	return m.WhatsApp.SendWhatsApp(ctx, req)
}
