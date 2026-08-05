package pesapal

import (
	"context"
	"fmt"
	"log/slog"
)

type SubmitOrderRequest struct {
	ID              string  `json:"id"`
	Amount          float64 `json:"amount"`
	Currency        string  `json:"currency"`
	Description     string  `json:"description"`
	CallbackURL     string  `json:"callback_url"`
	NotificationID  string  `json:"notification_id"`
}

type SubmitOrderResponse struct {
	OrderTrackingID string `json:"order_tracking_id"`
	RedirectURL     string `json:"redirect_url"`
	MerchantReference string `json:"merchant_reference"`
}

type TransactionStatusResponse struct {
	PaymentStatus          string  `json:"payment_status"`
	PaymentMethod          string  `json:"payment_method"`
	OrderTrackingID        string  `json:"order_tracking_id"`
	OrderMerchantReference string  `json:"order_merchant_reference"`
	Amount                 float64 `json:"amount"`
}

type Client struct {
	logger *slog.Logger
}

func NewClient(logger *slog.Logger) *Client {
	if logger == nil {
		logger = slog.Default()
	}
	return &Client{logger: logger}
}

func (c *Client) SubmitOrderRequest(ctx context.Context, req SubmitOrderRequest) (*SubmitOrderResponse, error) {
	c.logger.InfoContext(ctx, "pesapal_submit_order_stub",
		"merchant_ref", req.ID,
		"amount", req.Amount,
		"currency", req.Currency,
	)
	return &SubmitOrderResponse{
		OrderTrackingID:   fmt.Sprintf("PES-STUB-%s", req.ID),
		RedirectURL:       fmt.Sprintf("https://pay.pesapal.com/stub/%s", req.ID),
		MerchantReference: req.ID,
	}, nil
}

// GetTransactionStatus is a stub: no live Pesapal credentials are wired, so it never
// fabricates a completed payment. Real IPNs can't be verified without a live provider
// behind this client, and the platform must not show payment success it hasn't earned
// (see docs/haus-of-barber-audit.md "biggest lie-to-user risks"). Swap this method's body
// for a real Pesapal GetTransactionStatus call when credentials are available; the Service
// contract (server-computed amount, idempotent IPN) does not need to change.
func (c *Client) GetTransactionStatus(ctx context.Context, orderTrackingID string) (*TransactionStatusResponse, error) {
	c.logger.InfoContext(ctx, "pesapal_get_status_stub_no_provider",
		"order_tracking_id", orderTrackingID,
		"note", "stub provider not connected to live Pesapal; payment never auto-completes",
	)
	return &TransactionStatusResponse{
		PaymentStatus:          "PENDING",
		OrderTrackingID:        orderTrackingID,
		OrderMerchantReference: orderTrackingID,
	}, nil
}
