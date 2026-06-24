package pesapal

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

type createOrderBody struct {
	AmountKES         int64  `json:"amount_kes"`
	MerchantReference string `json:"merchant_reference"`
	Description       string `json:"description"`
	CallbackURL       string `json:"callback_url"`
}

func (h *Handler) CreateOrder(c *fiber.Ctx) error {
	var body createOrderBody
	if err := c.BodyParser(&body); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}

	orgID := platformtenancy.OrgIDFrom(c)
	if orgID == uuid.Nil {
		if v := c.Query("org_id"); v != "" {
			parsed, err := uuid.Parse(v)
			if err != nil {
				return httpx.ValidationProblem(c, "invalid org_id", nil)
			}
			orgID = parsed
		}
	}

	resp, err := h.svc.CreateOrder(c.UserContext(), CreateOrderDTO{
		OrgID:             orgID,
		AmountKES:         body.AmountKES,
		MerchantReference: body.MerchantReference,
		Description:       body.Description,
		CallbackURL:       body.CallbackURL,
	})
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *Handler) IPN(c *fiber.Ctx) error {
	var payload IPNPayload
	if err := c.BodyParser(&payload); err != nil {
		return httpx.ValidationProblem(c, "invalid ipn payload", nil)
	}

	orgID := uuid.Nil
	if v := c.Query("org_id"); v != "" {
		parsed, err := uuid.Parse(v)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid org_id", nil)
		}
		orgID = parsed
	}

	dup, err := h.svc.HandleIPN(c.UserContext(), orgID, payload)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{
		"status":    "accepted",
		"duplicate": dup,
	})
}

func RegisterRoutes(router fiber.Router, h *Handler) {
	g := router.Group("/integrations/pesapal")
	g.Post("/orders", h.CreateOrder)
	g.Post("/ipn", h.IPN)
}
