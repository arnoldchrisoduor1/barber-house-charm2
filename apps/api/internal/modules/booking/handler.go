package booking

import (
	"strconv"
	"strings"

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
	filter := ListFilter{
		BranchID:      platformtenancy.OptionalBranchID(c),
		CustomerPhone: strings.TrimSpace(c.Query("customer_phone")),
		Status:        strings.TrimSpace(c.Query("status")),
		Date:          strings.TrimSpace(c.Query("date")),
	}
	if sid := strings.TrimSpace(c.Query("staff_id")); sid != "" {
		id, err := uuid.Parse(sid)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid staff_id", nil)
		}
		filter.StaffID = &id
	}
	rows, err := h.svc.List(c.UserContext(), orgID, filter)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) ListServices(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	rows, err := h.svc.ListServices(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) Catalog(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	resp, err := h.svc.Catalog(c.UserContext(), orgID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(resp)
}

func (h *Handler) StaffAvailabilityBatch(c *fiber.Ctx) error {
	q, err := parseStaffAvailabilityQuery(c)
	if err != nil {
		return httpx.ValidationProblem(c, "invalid query", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	resp, err := h.svc.StaffAvailability(c.UserContext(), orgID, q)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"availability": resp})
}

// parseStaffAvailabilityQuery manually parses query params because Fiber's
// QueryParser cannot bind *uuid.UUID or []uuid.UUID fields.
func parseStaffAvailabilityQuery(c *fiber.Ctx) (StaffAvailabilityQuery, error) {
	q := StaffAvailabilityQuery{
		BookingDate: c.Query("booking_date"),
		StartTime:   c.Query("start_time"),
	}
	if d := c.Query("duration_minutes"); d != "" {
		n, err := strconv.Atoi(d)
		if err != nil {
			return q, err
		}
		q.DurationMinutes = n
	}
	if b := c.Query("branch_id"); b != "" {
		id, err := uuid.Parse(b)
		if err != nil {
			return q, err
		}
		q.BranchID = &id
	}
	if raw := c.Query("staff_ids"); raw != "" {
		for _, part := range strings.Split(raw, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			id, err := uuid.Parse(part)
			if err != nil {
				return q, err
			}
			q.StaffIDs = append(q.StaffIDs, id)
		}
	}
	return q, nil
}

func (h *Handler) PortalCreate(c *fiber.Ctx) error {
	var dto PortalBookingDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreatePortalBooking(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
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
	var dto CreateBookingDTO
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
	var dto CreateBookingDTO
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

func (h *Handler) PatchStatus(c *fiber.Ctx) error {
	var dto PatchStatusDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	row, err := h.svc.PatchStatus(c.UserContext(), orgID, id, dto.Status)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) Availability(c *fiber.Ctx) error {
	var q AvailabilityQuery
	if err := c.QueryParser(&q); err != nil {
		return httpx.ValidationProblem(c, "invalid query", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	resp, err := h.svc.CheckAvailability(c.UserContext(), orgID, q)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(resp)
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/bookings", authz.RequireFeature(features, "bookings"))
	g.Get("/", h.List)
	g.Get("/catalog", h.Catalog)
	g.Get("/availability", h.Availability)
	g.Get("/staff-availability", h.StaffAvailabilityBatch)
	g.Post("/portal", h.PortalCreate)
	g.Get("/waitlist", h.ListWaitlist)
	g.Post("/waitlist", h.CreateWaitlist)
	g.Post("/", h.Create)
	g.Get("/:id/services", h.ListServices)
	g.Get("/:id", h.Get)
	g.Put("/:id", h.Update)
	g.Patch("/:id/status", h.PatchStatus)
	g.Delete("/:id", h.Delete)
}
