package notifications

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

const TypeSendBookingReminder = "notifications:send_booking_reminder"

type BookingReminderPayload struct {
	OrgID     uuid.UUID `json:"org_id"`
	BookingID uuid.UUID `json:"booking_id"`
	Phone     string    `json:"phone"`
	Channel   string    `json:"channel"`
	Message   string    `json:"message"`
}

func NewSendBookingReminderTask(payload BookingReminderPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeSendBookingReminder, data), nil
}

func HandleSendBookingReminder(svc *Service) asynq.HandlerFunc {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload BookingReminderPayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshal payload: %w", err)
		}
		return svc.SendBookingReminder(ctx, payload.OrgID, SendReminderDTO{
			Phone:     payload.Phone,
			Channel:   payload.Channel,
			Message:   payload.Message,
			BookingID: payload.BookingID,
		})
	}
}
