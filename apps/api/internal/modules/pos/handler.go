package pos

import (
	"errors"

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
	var dto CreateTransactionDTO
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

func (h *Handler) Checkout(c *fiber.Ctx) error {
	var dto CheckoutDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	if len(dto.Lines) == 0 {
		return httpx.ValidationProblem(c, "cart is empty", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.Checkout(c.UserContext(), orgID, dto)
	if err != nil {
		return posCheckoutError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func posCheckoutError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, ErrEmptyCart):
		return httpx.ValidationProblem(c, "cart is empty", nil)
	case errors.Is(err, ErrInsufficientStock):
		return httpx.ValidationProblem(c, "insufficient stock for one or more products", nil)
	case errors.Is(err, ErrInvalidCatalogItem):
		return httpx.ValidationProblem(c, "one or more catalog items are invalid or inactive", nil)
	case errors.Is(err, ErrInsufficientCash):
		return httpx.ValidationProblem(c, "cash tendered is less than total", nil)
	case errors.Is(err, ErrInvalidPayment):
		return httpx.ValidationProblem(c, "invalid payment method", nil)
	default:
		return httpx.From(c, err)
	}
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/transactions", authz.RequireFeature(features, "pos_payments"))
	g.Get("/", h.List)
	g.Post("/checkout", h.Checkout)
	g.Get("/:id", h.Get)
	g.Post("/", h.Create)
}
