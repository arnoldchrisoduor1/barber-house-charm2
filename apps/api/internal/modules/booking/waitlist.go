package booking

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type WaitlistEntry struct {
	ID               uuid.UUID  `json:"id"`
	OrganizationID   uuid.UUID  `json:"organizationId"`
	CustomerID       uuid.UUID  `json:"customerId"`
	ServiceID        *uuid.UUID `json:"serviceId,omitempty"`
	PreferredStaffID *uuid.UUID `json:"preferredStaffId,omitempty"`
	Notes            string     `json:"notes,omitempty"`
	CreatedAt        string     `json:"createdAt,omitempty"`
}

func (r *Repository) ListWaitlist(ctx context.Context, orgID uuid.UUID) ([]WaitlistEntry, error) {
	var rows []WaitlistEntry
	err := r.db.WithContext(ctx).
		Table("waitlist").
		Where("organization_id = ?", orgID).
		Order("created_at ASC").
		Find(&rows).Error
	return rows, err
}

func (r *Repository) CreateWaitlist(ctx context.Context, orgID uuid.UUID, customerID uuid.UUID, notes string) (*WaitlistEntry, error) {
	row := WaitlistEntry{
		ID:             uuid.New(),
		OrganizationID: orgID,
		CustomerID:     customerID,
		Notes:          notes,
	}
	err := r.db.WithContext(ctx).Table("waitlist").Create(&row).Error
	return &row, err
}

func (h *Handler) ListWaitlist(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListWaitlist(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateWaitlist(c *fiber.Ctx) error {
	var dto struct {
		CustomerID uuid.UUID `json:"customerId"`
		Notes      string    `json:"notes"`
	}
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateWaitlist(c.UserContext(), orgID, dto.CustomerID, dto.Notes)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (s *Service) ListWaitlist(ctx context.Context, orgID uuid.UUID) ([]WaitlistEntry, error) {
	return s.repo.ListWaitlist(ctx, orgID)
}

func (s *Service) CreateWaitlist(ctx context.Context, orgID uuid.UUID, customerID uuid.UUID, notes string) (*WaitlistEntry, error) {
	return s.repo.CreateWaitlist(ctx, orgID, customerID, notes)
}
