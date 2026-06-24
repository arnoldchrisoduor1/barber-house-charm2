package notifications

import (
	"context"
	"fmt"
	"log/slog"
)

type AfricasTalkingSMS struct {
	logger *slog.Logger
}

func NewAfricasTalkingSMS(logger *slog.Logger) *AfricasTalkingSMS {
	if logger == nil {
		logger = slog.Default()
	}
	return &AfricasTalkingSMS{logger: logger}
}

func (a *AfricasTalkingSMS) SendSMS(ctx context.Context, req SMSRequest) (string, error) {
	ref := fmt.Sprintf("at-stub-%d", len(req.Message))
	a.logger.InfoContext(ctx, "sms_send_stub",
		"provider", "africas_talking",
		"to_masked", maskPhone(req.To),
		"ref", ref,
	)
	return ref, nil
}

func maskPhone(phone string) string {
	if len(phone) <= 4 {
		return "****"
	}
	return "****" + phone[len(phone)-4:]
}
