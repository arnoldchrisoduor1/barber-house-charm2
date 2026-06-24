package inventory

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
	return c.JSON(fiber.Map{"data": rows})
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/inventory", authz.RequireFeature(features, "inventory_tracking"))
	g.Get("/", h.List)
}
