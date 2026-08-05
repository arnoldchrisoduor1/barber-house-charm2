package notifications

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

// OutboundSender sends SMS/WhatsApp and records delivery rows.
type OutboundSender interface {
	SendOutbound(ctx context.Context, orgID uuid.UUID, channel, phone, templateKey, body string) error
	DeliversExternally() bool
}

func (s *Service) DeliversExternally() bool {
	return DeliversExternally(s.notifier)
}

func (s *Service) SendOutbound(ctx context.Context, orgID uuid.UUID, channel, phone, templateKey, body string) error {
	if strings.TrimSpace(phone) == "" {
		return fmt.Errorf("phone required")
	}
	ch := strings.ToLower(strings.TrimSpace(channel))
	if ch == "" {
		ch = "sms"
	}
	n := &Notification{
		OrganizationID: orgID,
		RecipientPhone: phone,
		Channel:        ch,
		TemplateKey:    templateKey,
		Body:           body,
		Status:         "pending",
	}
	if err := s.repo.Create(ctx, n); err != nil {
		return err
	}
	return s.dispatch(ctx, orgID, n, ch, phone, templateKey, body)
}

func (s *Service) dispatch(ctx context.Context, orgID uuid.UUID, n *Notification, channel, phone, templateKey, body string) error {
	var externalRef string
	var sendErr error
	switch channel {
	case "whatsapp":
		externalRef, sendErr = s.notifier.SendWhatsApp(ctx, WhatsAppRequest{
			To:           phone,
			TemplateName: templateKey,
			Body:         body,
		})
	default:
		externalRef, sendErr = s.notifier.SendSMS(ctx, SMSRequest{
			To:      phone,
			Message: body,
		})
	}
	status := "sent"
	errMsg := ""
	if sendErr != nil {
		status = "failed"
		errMsg = sendErr.Error()
	} else if !s.DeliversExternally() {
		status = "dry_run"
	}
	return s.repo.UpdateStatus(ctx, orgID, n.ID, status, externalRef, errMsg)
}

// EnqueueReviewRequest queues a post-checkout review SMS/WA when features allow.
func (s *Service) EnqueueReviewRequest(ctx context.Context, orgID uuid.UUID, customerID *uuid.UUID, phone string, txID uuid.UUID) error {
	if strings.TrimSpace(phone) == "" {
		return nil
	}
	if s.asynq == nil {
		return s.SendReviewRequest(ctx, orgID, ReviewRequestPayload{
			OrgID:      orgID,
			CustomerID: customerID,
			Phone:      phone,
			TxID:       txID,
		})
	}
	task, err := NewSendReviewRequestTask(ReviewRequestPayload{
		OrgID:      orgID,
		CustomerID: customerID,
		Phone:      phone,
		TxID:       txID,
	})
	if err != nil {
		return err
	}
	_, err = s.asynq.Enqueue(task, asynq.Queue("notifications"))
	return err
}

type ReviewRequestPayload struct {
	OrgID      uuid.UUID  `json:"org_id"`
	CustomerID *uuid.UUID `json:"customer_id,omitempty"`
	Phone      string     `json:"phone"`
	TxID       uuid.UUID  `json:"tx_id"`
}

func (s *Service) SendReviewRequest(ctx context.Context, orgID uuid.UUID, payload ReviewRequestPayload) error {
	link := strings.TrimRight(s.webURL, "/") + "/reviews"
	body := fmt.Sprintf("Thanks for visiting! Share your experience: %s", link)
	channel := "sms"
	if s.DeliversExternally() {
		// prefer whatsapp when live WA configured
		if wa, ok := s.notifier.(*MultiNotifier); ok {
			if d, ok := wa.WhatsApp.(DeliveryAware); ok && d.DeliversExternally() {
				channel = "whatsapp"
			}
		}
	}
	return s.SendOutbound(ctx, orgID, channel, payload.Phone, "review_request", body)
}
