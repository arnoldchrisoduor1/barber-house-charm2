package staff

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type ShiftSwapRequest struct {
	database.Base
	OrganizationID     uuid.UUID  `gorm:"type:uuid;not null;index"`
	FromStaffID        uuid.UUID  `gorm:"type:uuid;not null;index"`
	ToStaffID          uuid.UUID  `gorm:"type:uuid;not null;index"`
	ScheduleDate       time.Time  `gorm:"type:date;not null"`
	ShiftLabel         string
	FromScheduleID     *uuid.UUID `gorm:"type:uuid"`
	ToScheduleID       *uuid.UUID `gorm:"type:uuid"`
	Status             string     `gorm:"not null;default:pending"`
	ReviewedByUserID   *uuid.UUID `gorm:"type:uuid"`
	ReviewedAt         *time.Time
	ReviewNote         string
}

func (ShiftSwapRequest) TableName() string { return "shift_swap_requests" }
func (ShiftSwapRequest) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*ShiftSwapRequest)(nil)

type CreateShiftSwapDTO struct {
	FromStaffID    uuid.UUID  `json:"from_staff_id"`
	ToStaffID      uuid.UUID  `json:"to_staff_id"`
	ScheduleDate   string     `json:"schedule_date"`
	ShiftLabel     string     `json:"shift_label"`
	FromScheduleID *uuid.UUID `json:"from_schedule_id"`
	ToScheduleID   *uuid.UUID `json:"to_schedule_id"`
}

type ReviewShiftSwapDTO struct {
	Note string `json:"note"`
}

func (s *Service) ListShiftSwaps(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID) ([]ShiftSwapRequest, error) {
	return s.repo.ListShiftSwaps(ctx, orgID, staffID)
}

func (s *Service) CreateShiftSwap(ctx context.Context, orgID uuid.UUID, actorID *uuid.UUID, dto CreateShiftSwapDTO) (*ShiftSwapRequest, error) {
	if dto.FromStaffID == uuid.Nil || dto.ToStaffID == uuid.Nil || dto.FromStaffID == dto.ToStaffID {
		return nil, httpx.ErrConflict
	}
	date, err := time.Parse("2006-01-02", dto.ScheduleDate)
	if err != nil {
		return nil, httpx.ErrConflict
	}
	if _, err := s.Get(ctx, orgID, dto.FromStaffID); err != nil {
		return nil, httpx.ErrNotFound
	}
	if _, err := s.Get(ctx, orgID, dto.ToStaffID); err != nil {
		return nil, httpx.ErrNotFound
	}
	row := &ShiftSwapRequest{
		OrganizationID: orgID,
		FromStaffID:    dto.FromStaffID,
		ToStaffID:      dto.ToStaffID,
		ScheduleDate:   date,
		ShiftLabel:     strings.TrimSpace(dto.ShiftLabel),
		FromScheduleID: dto.FromScheduleID,
		ToScheduleID:   dto.ToScheduleID,
		Status:         "pending",
	}
	if err := s.repo.CreateShiftSwap(ctx, row); err != nil {
		return nil, err
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{
			"from_staff_id": dto.FromStaffID, "to_staff_id": dto.ToStaffID, "schedule_date": dto.ScheduleDate,
		})
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "shift_swap.requested", "shift_swap_request", &row.ID, meta)
	}
	return row, nil
}

func (s *Service) ApproveShiftSwap(ctx context.Context, orgID, id uuid.UUID, actorID *uuid.UUID, dto ReviewShiftSwapDTO) (*ShiftSwapRequest, error) {
	return s.reviewShiftSwap(ctx, orgID, id, actorID, "approved", dto.Note, true)
}

func (s *Service) DenyShiftSwap(ctx context.Context, orgID, id uuid.UUID, actorID *uuid.UUID, dto ReviewShiftSwapDTO) (*ShiftSwapRequest, error) {
	return s.reviewShiftSwap(ctx, orgID, id, actorID, "denied", dto.Note, false)
}

func (s *Service) reviewShiftSwap(
	ctx context.Context,
	orgID, id uuid.UUID,
	actorID *uuid.UUID,
	status, note string,
	swapSchedules bool,
) (*ShiftSwapRequest, error) {
	row, err := s.repo.GetShiftSwap(ctx, orgID, id)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	if row.Status != "pending" {
		return nil, httpx.ErrConflict
	}
	if swapSchedules {
		if err := s.applyShiftSwap(ctx, orgID, row); err != nil {
			return nil, err
		}
	}
	now := time.Now()
	row.Status = status
	row.ReviewNote = strings.TrimSpace(note)
	row.ReviewedAt = &now
	row.ReviewedByUserID = actorID
	if err := s.repo.UpdateShiftSwap(ctx, orgID, row); err != nil {
		return nil, err
	}
	action := "shift_swap.denied"
	if swapSchedules {
		action = "shift_swap.approved"
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{"from_staff_id": row.FromStaffID, "to_staff_id": row.ToStaffID, "status": status})
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, action, "shift_swap_request", &row.ID, meta)
	}
	return row, nil
}

func (s *Service) applyShiftSwap(ctx context.Context, orgID uuid.UUID, swap *ShiftSwapRequest) error {
	dateStr := swap.ScheduleDate.Format("2006-01-02")
	fromSched, err := s.findSwapSchedule(ctx, orgID, swap.FromScheduleID, swap.FromStaffID, dateStr)
	if err != nil {
		return err
	}
	toSched, err := s.findSwapSchedule(ctx, orgID, swap.ToScheduleID, swap.ToStaffID, dateStr)
	if err != nil {
		return err
	}
	if fromSched != nil && toSched != nil {
		fromStaff := fromSched.StaffID
		toStaff := toSched.StaffID
		fromSched.StaffID = toStaff
		toSched.StaffID = fromStaff
		if err := s.repo.UpdateSchedule(ctx, orgID, fromSched); err != nil {
			return err
		}
		return s.repo.UpdateSchedule(ctx, orgID, toSched)
	}
	if fromSched != nil {
		fromSched.StaffID = swap.ToStaffID
		return s.repo.UpdateSchedule(ctx, orgID, fromSched)
	}
	if toSched != nil {
		toSched.StaffID = swap.FromStaffID
		return s.repo.UpdateSchedule(ctx, orgID, toSched)
	}
	return nil
}

func (s *Service) findSwapSchedule(ctx context.Context, orgID uuid.UUID, scheduleID *uuid.UUID, staffID uuid.UUID, date string) (*StaffSchedule, error) {
	if scheduleID != nil && *scheduleID != uuid.Nil {
		row, err := s.repo.GetSchedule(ctx, orgID, *scheduleID)
		if err != nil {
			return nil, nil
		}
		return row, nil
	}
	return s.repo.GetScheduleByStaffDate(ctx, orgID, staffID, date)
}
