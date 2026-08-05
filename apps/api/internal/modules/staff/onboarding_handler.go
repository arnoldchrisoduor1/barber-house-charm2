package staff

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (h *Handler) ListOnboardingTemplates(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListOnboardingTemplates(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateOnboardingTemplate(c *fiber.Ctx) error {
	var dto CreateOnboardingTemplateDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateOnboardingTemplate(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) ListOnboardingProgress(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	var staffID *uuid.UUID
	if v := c.Query("staff_id"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid staff_id", nil)
		}
		staffID = &id
	}
	rows, err := h.svc.ListOnboardingProgress(c.UserContext(), orgID, staffID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) EnrollOnboarding(c *fiber.Ctx) error {
	var dto EnrollOnboardingDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	var actorID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		actorID = &u.ID
	}
	row, err := h.svc.EnrollOnboarding(c.UserContext(), orgID, actorID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) ToggleOnboardingItem(c *fiber.Ctx) error {
	var dto ToggleOnboardingDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	var actorID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		actorID = &u.ID
	}
	row, err := h.svc.ToggleOnboardingItem(c.UserContext(), orgID, actorID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func RegisterOnboardingRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/onboarding", authz.RequireFeature(features, "staff_onboarding"))
	g.Get("/templates", h.ListOnboardingTemplates)
	g.Post("/templates", authz.RequireRole("ceo", "director", "branch_manager"), h.CreateOnboardingTemplate)
	g.Get("/progress", h.ListOnboardingProgress)
	g.Post("/enroll", authz.RequireRole("ceo", "director", "branch_manager"), h.EnrollOnboarding)
	g.Post("/toggle", h.ToggleOnboardingItem)
}
