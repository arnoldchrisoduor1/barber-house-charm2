package mobile

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
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

func (h *Handler) ListZones(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListZones(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetZone(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.GetZone(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateZone(c *fiber.Ctx) error {
	var dto CoverageZoneDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateZone(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateZone(c *fiber.Ctx) error {
	var dto CoverageZoneDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.UpdateZone(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteZone(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.DeleteZone(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListJobs(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	var staffID *uuid.UUID
	if raw := c.Query("staff_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid staff_id", nil)
		}
		staffID = &id
	}
	rows, err := h.svc.ListJobs(c.UserContext(), orgID, staffID, c.Query("status"))
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetJob(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.GetJob(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateJob(c *fiber.Ctx) error {
	var dto FieldJobDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateJob(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateJob(c *fiber.Ctx) error {
	var dto FieldJobDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.UpdateJob(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) AdvanceJob(c *fiber.Ctx) error {
	var dto AdvanceStatusDTO
	_ = c.BodyParser(&dto)
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.AdvanceJob(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteJob(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.DeleteJob(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	zones := org.Group("/coverage-zones", authz.RequireFeature(features, "coverage_zones"))
	zones.Get("/", h.ListZones)
	zones.Post("/", h.CreateZone)
	zones.Get("/:id", h.GetZone)
	zones.Put("/:id", h.UpdateZone)
	zones.Delete("/:id", h.DeleteZone)

	jobs := org.Group("/field-jobs", authz.RequireFeature(features, "coverage_zones"))
	jobs.Get("/", h.ListJobs)
	jobs.Post("/", h.CreateJob)
	jobs.Get("/:id", h.GetJob)
	jobs.Put("/:id", h.UpdateJob)
	jobs.Post("/:id/advance", h.AdvanceJob)
	jobs.Delete("/:id", h.DeleteJob)
}
