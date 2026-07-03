package analytics

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/authz"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
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
	staffIDStr := c.Query("staff_id")
	var staffID uuid.UUID
	var err error
	if staffIDStr != "" {
		staffID, err = uuid.Parse(staffIDStr)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid staff_id", nil)
		}
	} else if u := platformauth.UserFrom(c); u != nil {
		staffID, err = h.svc.StaffIDForUser(c.UserContext(), orgID, u.ID)
		if err != nil {
			return httpx.ValidationProblem(c, "staff profile not found for user", nil)
		}
	} else {
		return httpx.ValidationProblem(c, "staff_id required", nil)
	}
	data, err := h.svc.MyEarnings(c.UserContext(), orgID, staffID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(data)
}

func (h *Handler) RevenueChart(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	days := c.QueryInt("days", 7)
	data, err := h.svc.RevenueChart(c.UserContext(), orgID, branchID, days)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) PaymentMethods(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	data, err := h.svc.PaymentMethods(c.UserContext(), orgID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) TopServices(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	limit := c.QueryInt("limit", 5)
	data, err := h.svc.TopServices(c.UserContext(), orgID, branchID, limit)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) StaffLeaderboard(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	data, err := h.svc.StaffLeaderboard(c.UserContext(), orgID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *Handler) DashboardExtras(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	data, err := h.svc.DashboardExtras(c.UserContext(), orgID, branchID)
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
	g.Get("/revenue-chart", h.RevenueChart)
	g.Get("/payment-methods", h.PaymentMethods)
	g.Get("/top-services", h.TopServices)
	g.Get("/staff-leaderboard", h.StaffLeaderboard)
	g.Get("/dashboard-extras", h.DashboardExtras)

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
