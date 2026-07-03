package staff

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
)

type QRHandler struct {
	svc *QRService
}

func NewQRHandler(svc *QRService) *QRHandler {
	return &QRHandler{svc: svc}
}

func (h *QRHandler) Clock(c *fiber.Ctx) error {
	var dto ClockDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.Clock(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *QRHandler) ListScans(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	var staffID *uuid.UUID
	if sid := c.Query("staff_id"); sid != "" {
		id, err := uuid.Parse(sid)
		if err != nil {
			return httpx.ValidationProblem(c, "invalid staff_id", nil)
		}
		staffID = &id
	}
	rows, err := h.svc.ListScans(c.UserContext(), orgID, staffID, c.Query("date"))
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *QRHandler) Attendance(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	rows, err := h.svc.Attendance(c.UserContext(), orgID, branchID, c.Query("date"))
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *QRHandler) BranchToken(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID, err := uuid.Parse(c.Params("branch_id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid branch_id", nil)
	}
	token := h.svc.BranchToken(orgID, branchID)
	return c.JSON(fiber.Map{"token": token, "branch_id": branchID})
}

func RegisterQRRoutes(org fiber.Router, features *featuremod.Service, h *QRHandler) {
	g := org.Group("/qr", authz.RequireFeature(features, "qr_clock"))
	g.Post("/clock", h.Clock)
	g.Get("/scans", h.ListScans)
	g.Get("/attendance", h.Attendance)
	g.Get("/branch-token/:branch_id", h.BranchToken)
}
