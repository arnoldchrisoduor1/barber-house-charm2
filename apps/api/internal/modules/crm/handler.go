package crm

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
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

func (h *Handler) List(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	rows, err := h.svc.List(c.UserContext(), orgID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) Get(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.Get(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var dto CreateCustomerDTO
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

func (h *Handler) Update(c *fiber.Ctx) error {
	var dto UpdateCustomerDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.Update(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.Delete(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListOwnership(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	var staffID *uuid.UUID
	if raw := c.Query("staff_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid staff_id", nil)
		}
		staffID = &id
	}
	rows, err := h.svc.ListOwnership(c.UserContext(), orgID, staffID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) TransferOwnership(c *fiber.Ctx) error {
	var dto TransferOwnershipDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	if dto.Reason == "" {
		return httpx.ValidationProblem(c, "reason is required", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	var actorID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		actorID = &u.ID
	}
	row, err := h.svc.TransferOwnership(c.UserContext(), orgID, id, actorID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) MergeCustomers(c *fiber.Ctx) error {
	var dto MergeCustomersDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	var actorID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		actorID = &u.ID
	}
	row, err := h.svc.MergeCustomers(c.UserContext(), orgID, actorID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) ListTags(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListTags(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateTag(c *fiber.Ctx) error {
	var dto CreateTagDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateTag(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) DeleteTag(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.DeleteTag(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) SetCustomerTags(c *fiber.Ctx) error {
	var dto SetCustomerTagsDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.SetCustomerTags(c.UserContext(), orgID, customerID, dto); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListCustomerPhotos(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	rows, err := h.svc.ListCustomerPhotos(c.UserContext(), orgID, customerID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateCustomerPhoto(c *fiber.Ctx) error {
	var dto CreatePhotoDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.CreateCustomerPhoto(c.UserContext(), orgID, customerID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) DeleteCustomerPhoto(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	photoID, err := uuid.Parse(c.Params("photoId"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid photo id", nil)
	}
	if err := h.svc.DeleteCustomerPhoto(c.UserContext(), orgID, customerID, photoID); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListPatchTests(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	rows, err := h.svc.ListPatchTests(c.UserContext(), orgID, customerID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreatePatchTest(c *fiber.Ctx) error {
	var dto CreatePatchTestDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.CreatePatchTest(c.UserContext(), orgID, customerID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) ListConsultations(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	rows, err := h.svc.ListConsultations(c.UserContext(), orgID, customerID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateConsultation(c *fiber.Ctx) error {
	var dto CreateConsultationDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	customerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.CreateConsultation(c.UserContext(), orgID, customerID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/customers", authz.RequireFeature(features, "crm"))
	g.Get("/", h.List)
	g.Get("/ownership", h.ListOwnership)
	g.Post("/merge", authz.RequireRole("ceo", "director", "branch_manager"), h.MergeCustomers)
	g.Post("/", h.Create)
	g.Get("/:id/photos", h.ListCustomerPhotos)
	g.Post("/:id/photos", h.CreateCustomerPhoto)
	g.Delete("/:id/photos/:photoId", h.DeleteCustomerPhoto)
	g.Get("/:id/patch-tests", authz.RequireFeature(features, "clinical"), h.ListPatchTests)
	g.Post("/:id/patch-tests", authz.RequireFeature(features, "clinical"), h.CreatePatchTest)
	g.Get("/:id/consultations", authz.RequireFeature(features, "consultation_history"), h.ListConsultations)
	g.Post("/:id/consultations", authz.RequireFeature(features, "consultation_history"), h.CreateConsultation)
	g.Put("/:id/tags", h.SetCustomerTags)
	g.Get("/:id", h.Get)
	g.Patch("/:id/ownership", authz.RequireRole("ceo", "director", "branch_manager"), h.TransferOwnership)
	g.Put("/:id", h.Update)
	g.Delete("/:id", h.Delete)

	tags := org.Group("/customer-tags", authz.RequireFeature(features, "crm"))
	tags.Get("/", h.ListTags)
	tags.Post("/", h.CreateTag)
	tags.Delete("/:id", h.DeleteTag)
}
