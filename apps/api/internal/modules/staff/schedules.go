package staff

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Schedule struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organizationId"`
	StaffID        uuid.UUID  `json:"staffId"`
	BranchID       *uuid.UUID `json:"branchId,omitempty"`
	ScheduleDate   string     `json:"scheduleDate"`
	StartTime      string     `json:"startTime"`
	EndTime        string     `json:"endTime"`
	IsDayOff       bool       `json:"isDayOff"`
	Notes          string     `json:"notes,omitempty"`
}

func (r *Repository) ListSchedules(ctx context.Context, orgID uuid.UUID) ([]Schedule, error) {
	var rows []Schedule
	err := r.db.WithContext(ctx).
		Table("staff_schedules").
		Where("organization_id = ?", orgID).
		Order("schedule_date DESC").
		Find(&rows).Error
	return rows, err
}

func (h *Handler) ListSchedules(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListSchedules(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (s *Service) ListSchedules(ctx context.Context, orgID uuid.UUID) ([]Schedule, error) {
	return s.repo.ListSchedules(ctx, orgID)
}
