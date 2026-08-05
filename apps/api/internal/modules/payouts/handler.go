package payouts

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
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

func (h *Handler) List(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.List(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var dto CreatePayoutDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.Request(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

// Confirm checks the provider for a payout's authoritative status and only then, if
// confirmed complete, moves money in the ledger. Manager-triggered until a real
// OpenFloat webhook exists; see ConfirmPayout for why submission alone never suffices.
func (h *Handler) Confirm(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	var userID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		userID = &u.ID
	}
	row, err := h.svc.ConfirmPayout(c.UserContext(), orgID, id, userID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/payouts", authz.RequireFeature(features, "staff_commissions_payroll"))
	g.Get("/", h.List)
	g.Post("/", h.Create)
	g.Post("/:id/confirm", h.Confirm)
}
