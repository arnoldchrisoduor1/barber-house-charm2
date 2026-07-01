package settings

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
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

func parseID(c *fiber.Ctx) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return uuid.Nil, httpx.ValidationProblem(c, "invalid id", nil)
	}
	return id, nil
}

func (h *Handler) GetNotificationSettings(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.GetNotificationSettings(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) UpdateNotificationSettings(c *fiber.Ctx) error {
	var dto NotificationSettingsDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.UpdateNotificationSettings(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) ListEnquiries(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListEnquiries(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetEnquiry(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetEnquiry(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateEnquiry(c *fiber.Ctx) error {
	var dto EnquiryDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateEnquiry(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateEnquiry(c *fiber.Ctx) error {
	var dto EnquiryDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateEnquiry(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteEnquiry(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteEnquiry(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListStaffChat(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListStaffChat(c.UserContext(), orgID, c.Query("channel"))
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateStaffChat(c *fiber.Ctx) error {
	var dto StaffChatDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	user := platformauth.UserFrom(c)
	if user == nil {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateStaffChatMessage(c.UserContext(), orgID, user.ID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) DeleteStaffChat(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteStaffChatMessage(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) GetOrgBranding(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.GetOrgBranding(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) UpdateOrgBranding(c *fiber.Ctx) error {
	var dto OrgBrandingDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.UpdateOrgBranding(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) ListSeatRentals(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListSeatRentals(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetSeatRental(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetSeatRental(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateSeatRental(c *fiber.Ctx) error {
	var dto SeatRentalDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateSeatRental(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateSeatRental(c *fiber.Ctx) error {
	var dto SeatRentalDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateSeatRental(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteSeatRental(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteSeatRental(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListGalleryItems(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListGalleryItems(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetGalleryItem(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetGalleryItem(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateGalleryItem(c *fiber.Ctx) error {
	var dto GalleryItemDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateGalleryItem(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateGalleryItem(c *fiber.Ctx) error {
	var dto GalleryItemDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateGalleryItem(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteGalleryItem(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteGalleryItem(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListConsentForms(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListConsentForms(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetConsentForm(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetConsentForm(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateConsentForm(c *fiber.Ctx) error {
	var dto ConsentFormDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateConsentForm(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateConsentForm(c *fiber.Ctx) error {
	var dto ConsentFormDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateConsentForm(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteConsentForm(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteConsentForm(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListInbox(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	var userID *uuid.UUID
	if user := platformauth.UserFrom(c); user != nil {
		userID = &user.ID
	}
	rows, err := h.svc.ListInboxNotifications(c.UserContext(), orgID, userID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetInbox(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetInboxNotification(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateInbox(c *fiber.Ctx) error {
	var dto InboxNotificationDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateInboxNotification(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) MarkInboxRead(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.MarkInboxRead(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) DeleteInbox(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteInboxNotification(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListWhatsAppLogs(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListWhatsAppLogs(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	ns := org.Group("/notification-settings", authz.RequireFeature(features, "sms_reminders"))
	ns.Get("/", h.GetNotificationSettings)
	ns.Put("/", h.UpdateNotificationSettings)

	enq := org.Group("/enquiries")
	enq.Get("/", h.ListEnquiries)
	enq.Post("/", h.CreateEnquiry)
	enq.Get("/:id", h.GetEnquiry)
	enq.Put("/:id", h.UpdateEnquiry)
	enq.Delete("/:id", h.DeleteEnquiry)

	chat := org.Group("/staff-chat")
	chat.Get("/", h.ListStaffChat)
	chat.Post("/", h.CreateStaffChat)
	chat.Delete("/:id", h.DeleteStaffChat)

	branding := org.Group("/branding", authz.RequireFeature(features, "custom_branding"))
	branding.Get("/", h.GetOrgBranding)
	branding.Put("/", h.UpdateOrgBranding)

	seats := org.Group("/seat-rentals", authz.RequireFeature(features, "staff_commissions_payroll"))
	seats.Get("/", h.ListSeatRentals)
	seats.Post("/", h.CreateSeatRental)
	seats.Get("/:id", h.GetSeatRental)
	seats.Put("/:id", h.UpdateSeatRental)
	seats.Delete("/:id", h.DeleteSeatRental)

	gallery := org.Group("/gallery")
	gallery.Get("/", h.ListGalleryItems)
	gallery.Post("/", h.CreateGalleryItem)
	gallery.Get("/:id", h.GetGalleryItem)
	gallery.Put("/:id", h.UpdateGalleryItem)
	gallery.Delete("/:id", h.DeleteGalleryItem)

	consent := org.Group("/consent-forms", authz.RequireFeature(features, "clinical"))
	consent.Get("/", h.ListConsentForms)
	consent.Post("/", h.CreateConsentForm)
	consent.Get("/:id", h.GetConsentForm)
	consent.Put("/:id", h.UpdateConsentForm)
	consent.Delete("/:id", h.DeleteConsentForm)

	inbox := org.Group("/inbox")
	inbox.Get("/", h.ListInbox)
	inbox.Post("/", h.CreateInbox)
	inbox.Get("/:id", h.GetInbox)
	inbox.Post("/:id/read", h.MarkInboxRead)
	inbox.Delete("/:id", h.DeleteInbox)

	wa := org.Group("/whatsapp", authz.RequireFeature(features, "sms_reminders"))
	wa.Get("/logs", h.ListWhatsAppLogs)
}
