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

func (h *Handler) ListTimeOff(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	var staffID *uuid.UUID
	if v := c.Query("staff_id"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid staff_id", nil)
		}
		staffID = &id
	}
	rows, err := h.svc.ListTimeOff(c.UserContext(), orgID, staffID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateTimeOff(c *fiber.Ctx) error {
	var dto CreateTimeOffDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	var actorID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		actorID = &u.ID
	}
	row, err := h.svc.CreateTimeOff(c.UserContext(), orgID, actorID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) ApproveTimeOff(c *fiber.Ctx) error {
	return h.reviewTimeOff(c, true)
}

func (h *Handler) DenyTimeOff(c *fiber.Ctx) error {
	return h.reviewTimeOff(c, false)
}

func (h *Handler) reviewTimeOff(c *fiber.Ctx, approve bool) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	var dto ReviewTimeOffDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	var actorID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		actorID = &u.ID
	}
	if approve {
		row, err := h.svc.ApproveTimeOff(c.UserContext(), orgID, id, actorID, dto)
		if err != nil {
			return httpx.From(c, err)
		}
		return c.JSON(row)
	}
	row, err := h.svc.DenyTimeOff(c.UserContext(), orgID, id, actorID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func RegisterTimeOffRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/time-off", authz.RequireFeature(features, "staff_time_off"))
	g.Get("/", h.ListTimeOff)
	g.Post("/", h.CreateTimeOff)
	g.Post("/:id/approve", authz.RequireRole("ceo", "director", "branch_manager"), h.ApproveTimeOff)
	g.Post("/:id/deny", authz.RequireRole("ceo", "director", "branch_manager"), h.DenyTimeOff)
}
