package pos

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (h *Handler) VerifyManagerPIN(c *fiber.Ctx) error {
	var body struct {
		PIN string `json:"pin"`
	}
	if err := c.BodyParser(&body); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	if err := h.svc.ValidateManagerPIN(c.UserContext(), orgID, body.PIN); err != nil {
		if errors.Is(err, ErrInvalidManagerPIN) {
			return httpx.ProblemJSON(c, fiber.StatusForbidden, "Forbidden", "invalid manager PIN")
		}
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handler) ListTabs(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListTabs(c.UserContext(), orgID, c.Query("status"))
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) OpenTab(c *fiber.Ctx) error {
	var dto OpenTabDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.OpenTab(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) AddTabItem(c *fiber.Ctx) error {
	var dto AddTabItemDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	tabID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.AddTabItem(c.UserContext(), orgID, tabID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) CloseTab(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	tabID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.CloseTab(c.UserContext(), orgID, tabID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func registerTabsRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/pos", authz.RequireFeature(features, "pos_payments"))
	g.Post("/verify-pin", h.VerifyManagerPIN)
	g.Get("/tabs", h.ListTabs)
	g.Post("/tabs", h.OpenTab)
	g.Post("/tabs/:id/items", h.AddTabItem)
	g.Post("/tabs/:id/close", h.CloseTab)
}
