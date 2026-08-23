package shop

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Handler struct {
	svc     *Service
	tenancy *tenancymod.Service
}

func NewHandler(svc *Service, tenancy *tenancymod.Service) *Handler {
	return &Handler{svc: svc, tenancy: tenancy}
}

func (h *Handler) List(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.List(c.UserContext(), orgID, c.Query("status"))
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
	var dto CreateOrderDTO
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

func (h *Handler) Advance(c *fiber.Ctx) error {
	var dto AdvanceDTO
	_ = c.BodyParser(&dto)
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.Advance(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) Dashboard(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	stats, err := h.svc.Dashboard(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(stats)
}

func (h *Handler) PublicCatalog(c *fiber.Ctx) error {
	org, err := h.resolvePublicOrg(c)
	if err != nil {
		return err
	}
	rows, err := h.svc.Catalog(c.UserContext(), org.ID, c.Query("category"))
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{
		"org":  fiber.Map{"id": org.ID, "name": org.Name, "slug": org.Slug, "businessType": org.BusinessType},
		"data": rows,
	})
}

func (h *Handler) PublicProduct(c *fiber.Ctx) error {
	org, err := h.resolvePublicOrg(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.Product(c.UserContext(), org.ID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) PublicCheckout(c *fiber.Ctx) error {
	org, err := h.resolvePublicOrg(c)
	if err != nil {
		return err
	}
	var dto CreateOrderDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	// Public path: force pay-on-pickup (skip live Pesapal).
	if dto.PaymentMethod == "" || dto.PaymentMethod == "pesapal" {
		dto.PaymentMethod = "pay_on_pickup"
	}
	row, err := h.svc.Create(c.UserContext(), org.ID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) resolvePublicOrg(c *fiber.Ctx) (*tenancymod.Organization, error) {
	slug := strings.TrimSpace(c.Params("slug"))
	if slug == "" {
		return nil, httpx.ValidationProblem(c, "slug required", nil)
	}
	org, err := h.tenancy.FindBySlug(c.UserContext(), slug)
	if err != nil || org == nil {
		return nil, httpx.ProblemJSON(c, fiber.StatusNotFound, "Not Found", "organization not found")
	}
	return org, nil
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/shop-orders", authz.RequireFeature(features, "shop_orders"))
	g.Get("/", h.List)
	g.Post("/", h.Create)
	g.Get("/dashboard", h.Dashboard)
	g.Get("/:id", h.Get)
	g.Post("/:id/advance", h.Advance)
}

func RegisterPublicRoutes(router fiber.Router, h *Handler) {
	router.Get("/organizations/public/:slug/shop/catalog", h.PublicCatalog)
	router.Get("/organizations/public/:slug/shop/products/:id", h.PublicProduct)
	router.Post("/organizations/public/:slug/shop/checkout", h.PublicCheckout)
}
