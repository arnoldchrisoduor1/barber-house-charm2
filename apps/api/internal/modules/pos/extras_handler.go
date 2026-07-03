package pos

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
)

func (h *Handler) ListTips(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	rows, err := h.svc.ListTips(c.UserContext(), orgID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateTip(c *fiber.Ctx) error {
	var dto TipDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateTip(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateTip(c *fiber.Ctx) error {
	var dto TipDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.UpdateTip(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteTip(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.DeleteTip(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ActiveShift(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	staffID, err := uuid.Parse(c.Query("staff_id"))
	if err != nil {
		return httpx.ValidationProblem(c, "staff_id required", nil)
	}
	row, err := h.svc.ActiveShift(c.UserContext(), orgID, staffID)
	if err != nil {
		return httpx.From(c, err)
	}
	if row == nil {
		return c.JSON(fiber.Map{"data": nil})
	}
	return c.JSON(row)
}

func (h *Handler) OpenShift(c *fiber.Ctx) error {
	var dto OpenShiftDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.OpenShift(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) CloseShift(c *fiber.Ctx) error {
	var dto CloseShiftDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.CloseShift(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func registerExtrasRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	tips := org.Group("/tips", authz.RequireFeature(features, "tips_management"))
	tips.Get("/", h.ListTips)
	tips.Post("/", h.CreateTip)
	tips.Put("/:id", h.UpdateTip)
	tips.Delete("/:id", h.DeleteTip)

	shifts := org.Group("/pos/shifts", authz.RequireFeature(features, "pos_payments"))
	shifts.Get("/active", h.ActiveShift)
	shifts.Post("/open", h.OpenShift)
	shifts.Post("/:id/close", h.CloseShift)
}
