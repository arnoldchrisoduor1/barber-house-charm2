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

func (h *Handler) ListShiftSwaps(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	var staffID *uuid.UUID
	if v := c.Query("staff_id"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid staff_id", nil)
		}
		staffID = &id
	}
	rows, err := h.svc.ListShiftSwaps(c.UserContext(), orgID, staffID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateShiftSwap(c *fiber.Ctx) error {
	var dto CreateShiftSwapDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	var actorID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		actorID = &u.ID
	}
	row, err := h.svc.CreateShiftSwap(c.UserContext(), orgID, actorID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) ApproveShiftSwap(c *fiber.Ctx) error {
	return h.reviewShiftSwap(c, true)
}

func (h *Handler) DenyShiftSwap(c *fiber.Ctx) error {
	return h.reviewShiftSwap(c, false)
}

func (h *Handler) reviewShiftSwap(c *fiber.Ctx, approve bool) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	var dto ReviewShiftSwapDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	var actorID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		actorID = &u.ID
	}
	if approve {
		row, err := h.svc.ApproveShiftSwap(c.UserContext(), orgID, id, actorID, dto)
		if err != nil {
			return httpx.From(c, err)
		}
		return c.JSON(row)
	}
	row, err := h.svc.DenyShiftSwap(c.UserContext(), orgID, id, actorID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func RegisterShiftSwapRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/shift-swaps", authz.RequireFeature(features, "staff_shift_swap"))
	g.Get("/", h.ListShiftSwaps)
	g.Post("/", h.CreateShiftSwap)
	g.Post("/:id/approve", authz.RequireRole("ceo", "director", "branch_manager"), h.ApproveShiftSwap)
	g.Post("/:id/deny", authz.RequireRole("ceo", "director", "branch_manager"), h.DenyShiftSwap)
}
