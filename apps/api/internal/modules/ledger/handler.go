package ledger

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
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

func (h *Handler) ListExpenses(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	rows, err := h.svc.ListExpenses(c.UserContext(), orgID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateExpense(c *fiber.Ctx) error {
	var dto ExpenseDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	var userID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		userID = &u.ID
	}
	row, err := h.svc.CreateExpense(c.UserContext(), orgID, userID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateExpense(c *fiber.Ctx) error {
	var dto ExpenseDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.UpdateExpense(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteExpense(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	if err := h.svc.DeleteExpense(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func RegisterOrgRoutes(org fiber.Router, h *Handler) {
	g := org.Group("/ledger")
	g.Get("/entries", h.List)
	g.Get("/balance", h.Balance)

	fg := org.Group("/finance")
	fg.Get("/expenses", h.ListExpenses)
	fg.Post("/expenses", h.CreateExpense)
	fg.Put("/expenses/:id", h.UpdateExpense)
	fg.Delete("/expenses/:id", h.DeleteExpense)
}
