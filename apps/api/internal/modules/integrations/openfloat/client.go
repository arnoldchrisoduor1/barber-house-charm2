package openfloat

import (
	"context"
	"fmt"
	"log/slog"
)

type DisburseRequest struct {
	MerchantReference string `json:"merchant_reference"`
	AmountKES         int64  `json:"amount_kes"`
	Phone             string `json:"phone"`
}

type DisburseResponse struct {
	Reference string `json:"reference"`
	Status    string `json:"status"`
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

func (c *Client) Disburse(ctx context.Context, req DisburseRequest) (*DisburseResponse, error) {
	c.logger.InfoContext(ctx, "openfloat_disburse_stub",
		"merchant_ref", req.MerchantReference,
		"amount_kes", req.AmountKES,
	)
	return &DisburseResponse{
		Reference: fmt.Sprintf("OF-STUB-%s", req.MerchantReference),
		Status:    "submitted",
	}, nil
}

type DisbursementStatusResponse struct {
	Reference string `json:"reference"`
	Status    string `json:"status"` // PROCESSING | COMPLETED | FAILED
}

// GetDisbursementStatus is a stub: no live OpenFloat credentials are wired, so a payout
// never auto-confirms as paid. Real money only leaves the tenant wallet once this reports
// COMPLETED from an actual provider — see payouts.Service.ConfirmPayout.
func (c *Client) GetDisbursementStatus(ctx context.Context, reference string) (*DisbursementStatusResponse, error) {
	c.logger.InfoContext(ctx, "openfloat_status_stub_no_provider",
		"reference", reference,
		"note", "stub provider not connected to live OpenFloat; payout never auto-completes",
	)
	return &DisbursementStatusResponse{Reference: reference, Status: "PROCESSING"}, nil
}
