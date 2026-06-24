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

func (h *PublicHandler) Create(c *fiber.Ctx) error {
	slug := strings.TrimSpace(c.Params("slug"))
	if slug == "" {
		return httpx.ValidationProblem(c, "slug required", nil)
	}
	org, err := h.tenancy.FindBySlug(c.UserContext(), slug)
	if err != nil || org == nil {
		return httpx.ProblemJSON(c, fiber.StatusNotFound, "Not Found", "organization not found")
	}

	var dto struct {
		Phone       string `json:"phone"`
		BookingDate string `json:"bookingDate"`
		StartTime   string `json:"startTime"`
		EndTime     string `json:"endTime"`
		FullName    string `json:"fullName"`
	}
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	if dto.Phone == "" || dto.BookingDate == "" || dto.StartTime == "" {
		return httpx.ValidationProblem(c, "phone, bookingDate, and startTime required", nil)
	}
	if dto.EndTime == "" {
		dto.EndTime = dto.StartTime
	}

	customerID := uuid.NewSHA1(uuid.NameSpaceURL, []byte("public:"+org.ID.String()+":"+dto.Phone))
	booking, err := h.bookings.Create(c.UserContext(), org.ID, CreateBookingDTO{
		CustomerID:  customerID,
		BookingDate: dto.BookingDate,
		StartTime:   dto.StartTime,
		EndTime:     dto.EndTime,
		Notes:       "Public booking: " + dto.FullName + " " + dto.Phone,
	})
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(booking)
}

func RegisterPublicRoutes(router fiber.Router, h *PublicHandler) {
	router.Post("/organizations/public/:slug/bookings", h.Create)
}
