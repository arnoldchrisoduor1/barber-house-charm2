package booking

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (h *Handler) GetBookingPolicy(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.GetBookingPolicy(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) UpdateBookingPolicy(c *fiber.Ctx) error {
	var dto BookingPolicyDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.UpdateBookingPolicy(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) ListBookingDeposits(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListBookingDeposits(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CollectBookingDeposit(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	bookingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	var body struct {
		PaymentRef string `json:"payment_ref"`
	}
	_ = c.BodyParser(&body)
	row, err := h.svc.CollectBookingDeposit(c.UserContext(), orgID, bookingID, body.PaymentRef)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func RegisterDepositRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	policy := org.Group("/booking-policy", authz.RequireFeature(features, "booking_deposits"))
	policy.Get("/", h.GetBookingPolicy)
	policy.Put("/", authz.RequireRole("ceo", "director", "branch_manager"), h.UpdateBookingPolicy)

	deps := org.Group("/booking-deposits", authz.RequireFeature(features, "booking_deposits"))
	deps.Get("/", h.ListBookingDeposits)
}
