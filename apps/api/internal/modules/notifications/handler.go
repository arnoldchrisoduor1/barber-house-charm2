package notifications

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/hibiken/asynq"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Handler struct {
	svc    *Service
	client *asynq.Client
}

func NewHandler(svc *Service, client *asynq.Client) *Handler {
	return &Handler{svc: svc, client: client}
}

type EnqueueReminderDTO struct {
	BookingID uuid.UUID `json:"booking_id"`
	Phone     string    `json:"phone"`
	Channel   string    `json:"channel"`
	Message   string    `json:"message"`
}

func (h *Handler) EnqueueReminder(c *fiber.Ctx) error {
	var dto EnqueueReminderDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	task, err := NewSendBookingReminderTask(BookingReminderPayload{
		OrgID:     orgID,
		BookingID: dto.BookingID,
		Phone:     dto.Phone,
		Channel:   dto.Channel,
		Message:   dto.Message,
	})
	if err != nil {
		return httpx.From(c, err)
	}
	info, err := h.client.Enqueue(task, asynq.Queue("notifications"))
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"task_id": info.ID,
		"queue":   info.Queue,
	})
}

func RegisterOrgRoutes(org fiber.Router, jwtSvc *platformauth.JWTService, h *Handler) {
	g := org.Group("/notifications")
	g.Post("/reminders", h.EnqueueReminder)
}
