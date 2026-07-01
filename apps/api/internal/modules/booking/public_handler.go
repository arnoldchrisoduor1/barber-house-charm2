package booking

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

type PublicHandler struct {
	bookings *Service
	tenancy  *tenancymod.Service
}

func NewPublicHandler(bookings *Service, tenancy *tenancymod.Service) *PublicHandler {
	return &PublicHandler{bookings: bookings, tenancy: tenancy}
}

func (h *PublicHandler) Catalog(c *fiber.Ctx) error {
	slug := strings.TrimSpace(c.Params("slug"))
	if slug == "" {
		return httpx.ValidationProblem(c, "slug required", nil)
	}
	org, err := h.tenancy.FindBySlug(c.UserContext(), slug)
	if err != nil || org == nil {
		return httpx.ProblemJSON(c, fiber.StatusNotFound, "Not Found", "organization not found")
	}
	var branchID *uuid.UUID
	if raw := c.Query("branch_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err == nil {
			branchID = &id
		}
	}
	resp, err := h.bookings.Catalog(c.UserContext(), org.ID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(resp)
}

func (h *PublicHandler) StaffAvailability(c *fiber.Ctx) error {
	slug := strings.TrimSpace(c.Params("slug"))
	if slug == "" {
		return httpx.ValidationProblem(c, "slug required", nil)
	}
	org, err := h.tenancy.FindBySlug(c.UserContext(), slug)
	if err != nil || org == nil {
		return httpx.ProblemJSON(c, fiber.StatusNotFound, "Not Found", "organization not found")
	}
	q, err := parseStaffAvailabilityQuery(c)
	if err != nil {
		return httpx.ValidationProblem(c, "invalid query", nil)
	}
	resp, err := h.bookings.StaffAvailability(c.UserContext(), org.ID, q)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"availability": resp})
}

func (h *PublicHandler) Create(c *fiber.Ctx) error {
	slug := strings.TrimSpace(c.Params("slug"))
	if slug == "" {
		return httpx.ValidationProblem(c, "slug required", nil)
	}
	org, err := h.tenancy.FindBySlug(c.UserContext(), slug)
	if err != nil || org == nil {
		return httpx.ProblemJSON(c, fiber.StatusNotFound, "Not Found", "organization not found")
	}

	var dto PortalBookingDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	booking, err := h.bookings.CreatePortalBooking(c.UserContext(), org.ID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(booking)
}

func RegisterPublicRoutes(router fiber.Router, h *PublicHandler) {
	router.Get("/organizations/public/:slug/catalog", h.Catalog)
	router.Get("/organizations/public/:slug/staff-availability", h.StaffAvailability)
	router.Post("/organizations/public/:slug/bookings", h.Create)
}
