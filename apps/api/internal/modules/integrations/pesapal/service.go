package pesapal

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/idempotency"
	platformrealtime "github.com/haus-of-wellness/api/internal/platform/realtime"
)

type LedgerRecorder interface {
	RecordCollection(ctx context.Context, orgID uuid.UUID, amount int64, ref string, txID *uuid.UUID) error
}

type AuditRecorder interface {
	RecordOrgAudit(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, metadata []byte) error
}

type Service struct {
	client      *Client
	repo        *Repository
	idempotency *idempotency.Store
	ledger      LedgerRecorder
	audit       AuditRecorder
	hub         *platformrealtime.Hub
	logger      *slog.Logger
}

func NewService(client *Client, repo *Repository, idempotency *idempotency.Store, ledger LedgerRecorder, audit AuditRecorder, hub *platformrealtime.Hub, logger *slog.Logger) *Service {
	if logger == nil {
		logger = slog.Default()
	}
	return &Service{
		client:      client,
		repo:        repo,
		idempotency: idempotency,
		ledger:      ledger,
		audit:       audit,
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

// CreateOrder persists the org-scoped, authenticated caller's amount as the authoritative
// order amount BEFORE contacting the provider. IPN handling later reads this stored amount
// rather than trusting the webhook body — see 01-security-tenancy.mdc "server always
// computes the order amount".
func (s *Service) CreateOrder(ctx context.Context, dto CreateOrderDTO) (*SubmitOrderResponse, error) {
	if dto.OrgID == uuid.Nil {
		return nil, fmt.Errorf("org context required")
	}
	if dto.MerchantReference == "" {
		return nil, fmt.Errorf("merchant_reference required")
	}
	if dto.AmountKES <= 0 {
		return nil, fmt.Errorf("invalid amount")
	}

	intent := &PaymentIntent{
		OrganizationID:    dto.OrgID,
		MerchantReference: dto.MerchantReference,
		AmountKES:         dto.AmountKES,
		Currency:          "KES",
		Status:            IntentPending,
	}
	if err := s.repo.Create(ctx, intent); err != nil {
		return nil, fmt.Errorf("create payment intent: %w", err)
	}

	resp, err := s.client.SubmitOrderRequest(ctx, SubmitOrderRequest{
		ID:             dto.MerchantReference,
		Amount:         float64(dto.AmountKES),
		Currency:       "KES",
		Description:    dto.Description,
		CallbackURL:    dto.CallbackURL,
		NotificationID: "stub-ipn-id",
	})
	if err != nil {
		_ = s.repo.MarkStatus(ctx, dto.OrgID, intent.ID, IntentFailed)
		return nil, err
	}
	if err := s.repo.UpdateOrderTrackingID(ctx, dto.OrgID, intent.ID, resp.OrderTrackingID); err != nil {
		s.logger.WarnContext(ctx, "pesapal_intent_tracking_update_failed", "error", err)
	}
	return resp, nil
}

type IPNPayload struct {
	OrderTrackingID        string `json:"OrderTrackingId"`
	OrderMerchantReference string `json:"OrderMerchantReference"`
}

// HandleIPN is a public webhook: there is no authenticated caller, so org and amount are
// NEVER taken from the request — only the merchant reference is trusted, and it is used
// solely to look up our own PaymentIntent row (written earlier by the authenticated
// CreateOrder call). Org, amount, and idempotency all flow from that stored intent.
func (s *Service) HandleIPN(ctx context.Context, payload IPNPayload) (duplicate bool, err error) {
	ref := payload.OrderMerchantReference
	if ref == "" {
		ref = payload.OrderTrackingID
	}
	if ref == "" {
		return false, fmt.Errorf("missing merchant reference")
	}

	intent, err := s.repo.FindByMerchantReference(ctx, ref)
	if err != nil {
		return false, fmt.Errorf("resolve payment intent: %w", err)
	}
	orgID := intent.OrganizationID

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

	// Re-query the provider server-to-server; never trust the webhook body's own status/amount.
	trackingID := intent.OrderTrackingID
	if trackingID == "" {
		trackingID = payload.OrderTrackingID
	}
	status, err := s.client.GetTransactionStatus(ctx, trackingID)
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

	// Server always computes the order amount: use what we stored at order-creation time,
	// not whatever the provider echoes back. If the provider's confirmed amount disagrees,
	// treat it as suspicious and refuse to complete rather than trusting either blindly.
	if status.Amount > 0 && int64(status.Amount) != intent.AmountKES {
		s.logger.WarnContext(ctx, "payment_ipn_amount_mismatch",
			"merchant_ref", ref, "expected_kes", intent.AmountKES, "provider_kes", status.Amount)
		return false, fmt.Errorf("provider amount does not match order amount")
	}
	amount := intent.AmountKES

	if s.ledger != nil {
		if err := s.ledger.RecordCollection(ctx, orgID, amount, ref, intent.TransactionID); err != nil {
			return false, err
		}
	}
	if err := s.repo.MarkStatus(ctx, orgID, intent.ID, IntentCompleted); err != nil {
		s.logger.WarnContext(ctx, "pesapal_intent_status_update_failed", "error", err)
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{
			"merchant_reference": ref,
			"amount_kes":         amount,
			"payment_method":     status.PaymentMethod,
		})
		_ = s.audit.RecordOrgAudit(ctx, orgID, nil, "payment.completed", "payment_intent", &intent.ID, meta)
	}

	if s.hub != nil {
		_ = s.hub.PublishQueue(ctx, orgID, "payment.completed", map[string]any{
			"merchant_reference": ref,
			"order_tracking_id":  trackingID,
			"payment_method":     status.PaymentMethod,
		})
	}

	if err := s.idempotency.MarkDone(ctx, "pesapal_ipn", ref); err != nil {
		s.logger.WarnContext(ctx, "idempotency mark failed", "error", err)
	}
	fulfilled = true
	return false, nil
}
