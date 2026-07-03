package payroll

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

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

func (h *Handler) ListRules(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListRules(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateRule(c *fiber.Ctx) error {
	var dto CommissionRuleDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateRule(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateRule(c *fiber.Ctx) error {
	var dto CommissionRuleDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.UpdateRule(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteRule(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.DeleteRule(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) CommissionSummary(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.CommissionSummary(c.UserContext(), orgID, c.Query("period", "month"))
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) ListPayslips(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListPayslips(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreatePayslip(c *fiber.Ctx) error {
	var dto PayslipDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreatePayslip(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) GetPayslip(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.GetPayslip(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/commissions", authz.RequireFeature(features, "staff_commissions_payroll"))
	g.Get("/rules", h.ListRules)
	g.Post("/rules", h.CreateRule)
	g.Put("/rules/:id", h.UpdateRule)
	g.Delete("/rules/:id", h.DeleteRule)
	g.Get("/summary", h.CommissionSummary)

	p := org.Group("/payroll", authz.RequireFeature(features, "staff_commissions_payroll"))
	p.Get("/payslips", h.ListPayslips)
	p.Post("/payslips", h.CreatePayslip)
	p.Get("/payslips/:id", h.GetPayslip)
}
