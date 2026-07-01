package analytics

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

func (h *Handler) Reports(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	data, err := h.svc.Reports(c.UserContext(), orgID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(data)
}

func (h *Handler) Scorecards(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	data, err := h.svc.Scorecards(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) RevenueForecast(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	data, err := h.svc.RevenueForecast(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) CallCentre(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	data, err := h.svc.CallCentre(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(data)
}

func (h *Handler) MyEarnings(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	staffID, err := uuid.Parse(c.Query("staff_id"))
	if err != nil {
		return httpx.ValidationProblem(c, "staff_id required", nil)
	}
	data, err := h.svc.MyEarnings(c.UserContext(), orgID, staffID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(data)
}

func (h *Handler) PatientIntake(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	data, err := h.svc.PatientIntake(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) Aftercare(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	data, err := h.svc.Aftercare(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) SessionNotes(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	data, err := h.svc.SessionNotes(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) ProgressTracking(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	data, err := h.svc.ProgressTracking(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) CoverageZones(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	data, err := h.svc.CoverageZones(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) FieldOperations(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	data, err := h.svc.FieldOperations(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/analytics", authz.RequireFeature(features, "basic_reports"))
	g.Get("/reports", h.Reports)

	adv := org.Group("/analytics", authz.RequireFeature(features, "advanced_analytics"))
	adv.Get("/scorecards", h.Scorecards)
	adv.Get("/revenue-forecast", h.RevenueForecast)
	adv.Get("/call-centre", h.CallCentre)
	adv.Get("/my-earnings", h.MyEarnings)

	clinical := org.Group("/analytics", authz.RequireFeature(features, "clinical"))
	clinical.Get("/patient-intake", h.PatientIntake)
	clinical.Get("/aftercare", h.Aftercare)

	therapy := org.Group("/analytics", authz.RequireFeature(features, "therapy_notes"))
	therapy.Get("/session-notes", h.SessionNotes)
	therapy.Get("/progress-tracking", h.ProgressTracking)

	mobile := org.Group("/analytics", authz.RequireFeature(features, "coverage_zones"))
	mobile.Get("/coverage-zones", h.CoverageZones)
	mobile.Get("/field-operations", h.FieldOperations)
}
