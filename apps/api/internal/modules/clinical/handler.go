package clinical

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

func (h *Handler) ListIntake(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	var customerID *uuid.UUID
	if raw := c.Query("customer_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid customer_id", nil)
		}
		customerID = &id
	}
	rows, err := h.svc.ListIntake(c.UserContext(), orgID, customerID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetIntake(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.GetIntake(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateIntake(c *fiber.Ctx) error {
	var dto PatientIntakeDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateIntake(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateIntake(c *fiber.Ctx) error {
	var dto PatientIntakeDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.UpdateIntake(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteIntake(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.DeleteIntake(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListAftercare(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListAftercare(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetAftercare(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.GetAftercare(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateAftercare(c *fiber.Ctx) error {
	var dto AftercareDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateAftercare(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateAftercare(c *fiber.Ctx) error {
	var dto AftercareDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.UpdateAftercare(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteAftercare(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.DeleteAftercare(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	intake := org.Group("/patient-intake", authz.RequireFeature(features, "clinical"))
	intake.Get("/", h.ListIntake)
	intake.Post("/", h.CreateIntake)
	intake.Get("/:id", h.GetIntake)
	intake.Put("/:id", h.UpdateIntake)
	intake.Delete("/:id", h.DeleteIntake)

	aftercare := org.Group("/aftercare-instructions", authz.RequireFeature(features, "clinical"))
	aftercare.Get("/", h.ListAftercare)
	aftercare.Post("/", h.CreateAftercare)
	aftercare.Get("/:id", h.GetAftercare)
	aftercare.Put("/:id", h.UpdateAftercare)
	aftercare.Delete("/:id", h.DeleteAftercare)
}
