package staff

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type OffboardStaffDTO struct {
	ReassignToStaffID *uuid.UUID `json:"reassign_to_staff_id"`
	Reason            string     `json:"reason"`
}

func (s *Service) Offboard(
	ctx context.Context,
	orgID, staffID uuid.UUID,
	actorID *uuid.UUID,
	dto OffboardStaffDTO,
) error {
	if strings.TrimSpace(dto.Reason) == "" {
		return httpx.ErrConflict
	}
	staff, err := s.Get(ctx, orgID, staffID)
	if err != nil {
		return err
	}
	if !staff.IsActive {
		return httpx.ErrConflict
	}
	if err := s.repo.ReassignCustomers(ctx, orgID, staffID, dto.ReassignToStaffID); err != nil {
		return err
	}
	if err := s.repo.ClearSeatRentals(ctx, orgID, staffID); err != nil {
		return err
	}
	if err := s.repo.CancelFutureBookings(ctx, orgID, staffID); err != nil {
		return err
	}
	staff.IsActive = false
	staff.UserID = nil
	if err := s.repo.Update(ctx, orgID, staff); err != nil {
		return err
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{
			"reason":                 dto.Reason,
			"reassign_to_staff_id":   dto.ReassignToStaffID,
			"staff_display_name":     staff.DisplayName,
		})
		sid := staffID
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "staff.offboard", "staff", &sid, meta)
	}
	return nil
}
