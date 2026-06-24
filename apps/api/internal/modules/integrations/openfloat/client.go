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
