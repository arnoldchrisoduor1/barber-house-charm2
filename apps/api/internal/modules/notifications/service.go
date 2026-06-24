package notifications

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

type Service struct {
	repo     *Repository
	notifier Notifier
}

func NewService(repo *Repository, notifier Notifier) *Service {
	return &Service{repo: repo, notifier: notifier}
}

type SendReminderDTO struct {
	Phone     string    `json:"phone"`
	Channel   string    `json:"channel"`
	Message   string    `json:"message"`
	BookingID uuid.UUID `json:"booking_id"`
}

func (s *Service) SendBookingReminder(ctx context.Context, orgID uuid.UUID, dto SendReminderDTO) error {
	if dto.Phone == "" {
		return fmt.Errorf("phone required")
	}
	channel := dto.Channel
	if channel == "" {
		channel = "sms"
	}

	n := &Notification{
		OrganizationID: orgID,
		RecipientPhone: dto.Phone,
		Channel:        channel,
		TemplateKey:    "booking_reminder",
		Body:           dto.Message,
		Status:         "pending",
		BookingID:      &dto.BookingID,
	}
	if err := s.repo.Create(ctx, n); err != nil {
		return err
	}

	var externalRef string
	var sendErr error
	switch channel {
	case "whatsapp":
		externalRef, sendErr = s.notifier.SendWhatsApp(ctx, WhatsAppRequest{
			To:           dto.Phone,
			TemplateName: "booking_reminder",
			Body:         dto.Message,
		})
	default:
		externalRef, sendErr = s.notifier.SendSMS(ctx, SMSRequest{
			To:      dto.Phone,
			Message: dto.Message,
		})
	}

	status := "sent"
	errMsg := ""
	if sendErr != nil {
		status = "failed"
		errMsg = sendErr.Error()
	}
	return s.repo.UpdateStatus(ctx, orgID, n.ID, status, externalRef, errMsg)
}
