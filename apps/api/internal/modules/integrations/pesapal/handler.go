package pesapal

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	"github.com/haus-of-wellness/api/internal/platform/authz"
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

	// Org comes only from authenticated membership (ResolveOrganization middleware), never
	// from the request — see 01-security-tenancy.mdc. This also means the amount below is
	// only ever what an authenticated staff member for THIS org submitted, not a random caller.
	orgID := platformtenancy.OrgIDFrom(c)
	if orgID == uuid.Nil {
		return httpx.ValidationProblem(c, "org context required", nil)
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

// IPN is a public, unauthenticated webhook by nature (Pesapal calls this, not our users).
// It resolves org + amount solely from the stored PaymentIntent via merchant reference —
// it never accepts an org_id from the caller, which would let anyone credit an arbitrary
// tenant's wallet by guessing/spoofing a reference.
func (h *Handler) IPN(c *fiber.Ctx) error {
	var payload IPNPayload
	if err := c.BodyParser(&payload); err != nil {
		return httpx.ValidationProblem(c, "invalid ipn payload", nil)
	}

	dup, err := h.svc.HandleIPN(c.UserContext(), payload)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{
		"status":    "accepted",
		"duplicate": dup,
	})
}

// RegisterPublicRoutes mounts the Pesapal IPN webhook, which cannot be behind auth.
func RegisterPublicRoutes(router fiber.Router, h *Handler) {
	router.Group("/integrations/pesapal").Post("/ipn", h.IPN)
}

// RegisterOrgRoutes mounts order creation behind auth + org resolution + pos_payments entitlement.
func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/integrations/pesapal", authz.RequireFeature(features, "pos_payments"))
	g.Post("/orders", h.CreateOrder)
}
