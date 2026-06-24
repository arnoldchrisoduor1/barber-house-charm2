package platform

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func RequirePlatformAdmin(svc *Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := platformauth.UserFrom(c)
		if user == nil {
			return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
		}
		ok, err := svc.IsPlatformAdmin(c.UserContext(), user.ID)
		if err != nil {
			return httpx.From(c, err)
		}
		if !ok {
			return httpx.ProblemJSON(c, fiber.StatusForbidden, "Forbidden", "platform admin required")
		}
		return c.Next()
	}
}

func (h *Handler) ListOrganizations(c *fiber.Ctx) error {
	orgs, err := h.svc.ListOrganizations(c.UserContext())
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": orgs})
}

func (h *Handler) ListSubscriptions(c *fiber.Ctx) error {
	rows, err := h.svc.ListSubscriptions(c.UserContext())
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) Health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok", "scope": "platform"})
}

type FeaturesHandler struct {
	features *featuremod.Service
}

func NewFeaturesHandler(features *featuremod.Service) *FeaturesHandler {
	return &FeaturesHandler{features: features}
}

func (fh *FeaturesHandler) List(c *fiber.Ctx) error {
	rows, err := fh.features.ListCatalog(c.UserContext())
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (fh *FeaturesHandler) Patch(c *fiber.Ctx) error {
	var dto struct {
		GlobalEnabled bool `json:"globalEnabled"`
	}
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	key := c.Params("key")
	if key == "" {
		return httpx.ValidationProblem(c, "key required", nil)
	}
	if err := fh.features.SetGlobalFlag(c.UserContext(), key, dto.GlobalEnabled); err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"key": key, "globalEnabled": dto.GlobalEnabled})
}

func RegisterRoutes(router fiber.Router, jwt *platformauth.JWTService, svc *Service, h *Handler, fh *FeaturesHandler) {
	g := router.Group("/platform", platformauth.JWT(jwt, false), RequirePlatformAdmin(svc))
	g.Get("/health", h.Health)
	g.Get("/organizations", h.ListOrganizations)
	g.Get("/subscriptions", h.ListSubscriptions)
	g.Get("/features", fh.List)
	g.Patch("/features/:key", fh.Patch)
}

func RegisterOrgAuditRoute(org fiber.Router, h *Handler) {
	org.Get("/audit-log", h.ListAudit)
}

func (h *Handler) ListAudit(c *fiber.Ctx) error {
	orgIDParam := c.Params("org")
	orgID, err := uuid.Parse(orgIDParam)
	if err != nil {
		return httpx.ValidationProblem(c, "invalid org", nil)
	}
	orgPtr := &orgID
	rows, err := h.svc.ListAuditLog(c.UserContext(), orgPtr)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}
