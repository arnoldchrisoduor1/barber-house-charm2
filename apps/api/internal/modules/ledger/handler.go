package ledger

import (
	"github.com/gofiber/fiber/v2"

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
	return c.JSON(rows)
}

func (h *Handler) Balance(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	resp, err := h.svc.Balance(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(resp)
}

func RegisterOrgRoutes(org fiber.Router, h *Handler) {
	g := org.Group("/ledger")
	g.Get("/entries", h.List)
	g.Get("/balance", h.Balance)
}
