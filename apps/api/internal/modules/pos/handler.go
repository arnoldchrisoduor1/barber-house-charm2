package pos

import (
	"github.com/gofiber/fiber/v2"

	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
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
	return c.JSON(rows)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var dto CreateTransactionDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.Create(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/transactions", authz.RequireFeature(features, "pos_payments"))
	g.Get("/", h.List)
	g.Post("/", h.Create)
}
