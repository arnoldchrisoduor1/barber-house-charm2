package pesapal

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/idempotency"
	platformrealtime "github.com/haus-of-wellness/api/internal/platform/realtime"
)

type LedgerRecorder interface {
	RecordCollection(ctx context.Context, orgID uuid.UUID, amount int64, ref string, txID *uuid.UUID) error
}

type Service struct {
	client      *Client
	idempotency *idempotency.Store
	ledger      LedgerRecorder
	hub         *platformrealtime.Hub
	logger      *slog.Logger
}

func NewService(client *Client, idempotency *idempotency.Store, ledger LedgerRecorder, hub *platformrealtime.Hub, logger *slog.Logger) *Service {
	if logger == nil {
		logger = slog.Default()
	}
	return &Service{
		client:      client,
		idempotency: idempotency,
		ledger:      ledger,
		hub:         hub,
		logger:      logger,
	}
}

type CreateOrderDTO struct {
	OrgID           uuid.UUID `json:"org_id"`
	AmountKES       int64     `json:"amount_kes"`
	MerchantReference string  `json:"merchant_reference"`
	Description     string    `json:"description"`
	CallbackURL     string    `json:"callback_url"`
}

func (s *Service) CreateOrder(ctx context.Context, dto CreateOrderDTO) (*SubmitOrderResponse, error) {
	if dto.MerchantReference == "" {
		return nil, fmt.Errorf("merchant_reference required")
	}
	if dto.AmountKES <= 0 {
		return nil, fmt.Errorf("invalid amount")
	}
	return s.client.SubmitOrderRequest(ctx, SubmitOrderRequest{
		ID:             dto.MerchantReference,
		Amount:         float64(dto.AmountKES),
		Currency:       "KES",
		Description:    dto.Description,
		CallbackURL:    dto.CallbackURL,
		NotificationID: "stub-ipn-id",
	})
}

type IPNPayload struct {
	OrderTrackingID        string `json:"OrderTrackingId"`
	OrderMerchantReference string `json:"OrderMerchantReference"`
}

func (s *Service) HandleIPN(ctx context.Context, orgID uuid.UUID, payload IPNPayload) (duplicate bool, err error) {
	ref := payload.OrderMerchantReference
	if ref == "" {
		ref = payload.OrderTrackingID
	}
	if ref == "" {
		return false, fmt.Errorf("missing merchant reference")
	}

	processed, err := s.idempotency.IsProcessed(ctx, "pesapal_ipn", ref)
	if err != nil {
		return false, err
	}
	if processed {
		s.logger.InfoContext(ctx, "payment_ipn_duplicate", "merchant_ref", ref)
		return true, nil
	}

	acquired, err := s.idempotency.TryAcquire(ctx, "pesapal_ipn", ref)
	if err != nil {
		return false, err
	}
	if !acquired {
		s.logger.InfoContext(ctx, "payment_ipn_duplicate", "merchant_ref", ref)
		return true, nil
	}
	fulfilled := false
	defer func() {
		if !fulfilled {
			_ = s.idempotency.Release(ctx, "pesapal_ipn", ref)
		}
	}()

	status, err := s.client.GetTransactionStatus(ctx, payload.OrderTrackingID)
	if err != nil {
		return false, err
	}

	s.logger.InfoContext(ctx, "payment_ipn_received",
		"merchant_ref", ref,
		"status", status.PaymentStatus,
		"method", status.PaymentMethod,
	)

	if status.PaymentStatus != "COMPLETED" {
		return false, nil
	}

	amount := int64(status.Amount)
	if amount <= 0 {
		amount = 1
	}
	if s.ledger != nil {
		if err := s.ledger.RecordCollection(ctx, orgID, amount, ref, nil); err != nil {
			return false, err
		}
	}

	if s.hub != nil {
		_ = s.hub.PublishQueue(ctx, orgID, "payment.completed", map[string]any{
			"merchant_reference": ref,
			"order_tracking_id":  payload.OrderTrackingID,
			"payment_method":     status.PaymentMethod,
		})
	}

	if err := s.idempotency.MarkDone(ctx, "pesapal_ipn", ref); err != nil {
		s.logger.WarnContext(ctx, "idempotency mark failed", "error", err)
	}
	fulfilled = true
	return false, nil
}
