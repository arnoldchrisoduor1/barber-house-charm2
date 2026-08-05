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

type TimeOffRequest struct {
	database.Base
	OrganizationID     uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID            uuid.UUID  `gorm:"type:uuid;not null;index"`
	StartDate          time.Time  `gorm:"type:date;not null"`
	EndDate            time.Time  `gorm:"type:date;not null"`
	Reason             string
	Status             string     `gorm:"not null;default:pending"`
	ReviewedByUserID   *uuid.UUID `gorm:"type:uuid"`
	ReviewedAt         *time.Time
	ReviewNote         string
}

func (TimeOffRequest) TableName() string { return "time_off_requests" }
func (TimeOffRequest) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*TimeOffRequest)(nil)

type CreateTimeOffDTO struct {
	StaffID    uuid.UUID `json:"staff_id"`
	StartDate  string    `json:"start_date"`
	EndDate    string    `json:"end_date"`
	Reason     string    `json:"reason"`
}

type ReviewTimeOffDTO struct {
	Note string `json:"note"`
}

func (s *Service) ListTimeOff(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID) ([]TimeOffRequest, error) {
	return s.repo.ListTimeOff(ctx, orgID, staffID)
}

func (s *Service) CreateTimeOff(ctx context.Context, orgID uuid.UUID, actorID *uuid.UUID, dto CreateTimeOffDTO) (*TimeOffRequest, error) {
	if dto.StaffID == uuid.Nil {
		return nil, httpx.ErrConflict
	}
	start, err := time.Parse("2006-01-02", dto.StartDate)
	if err != nil {
		return nil, httpx.ErrConflict
	}
	end, err := time.Parse("2006-01-02", dto.EndDate)
	if err != nil || end.Before(start) {
		return nil, httpx.ErrConflict
	}
	row := &TimeOffRequest{
		OrganizationID: orgID,
		StaffID:        dto.StaffID,
		StartDate:      start,
		EndDate:        end,
		Reason:         strings.TrimSpace(dto.Reason),
		Status:         "pending",
	}
	if err := s.repo.CreateTimeOff(ctx, row); err != nil {
		return nil, err
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{
			"staff_id": dto.StaffID, "start_date": dto.StartDate, "end_date": dto.EndDate,
		})
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "time_off.requested", "time_off_request", &row.ID, meta)
	}
	return row, nil
}

func (s *Service) ApproveTimeOff(ctx context.Context, orgID, id uuid.UUID, actorID *uuid.UUID, dto ReviewTimeOffDTO) (*TimeOffRequest, error) {
	return s.reviewTimeOff(ctx, orgID, id, actorID, "approved", dto.Note, "time_off.approved")
}

func (s *Service) DenyTimeOff(ctx context.Context, orgID, id uuid.UUID, actorID *uuid.UUID, dto ReviewTimeOffDTO) (*TimeOffRequest, error) {
	return s.reviewTimeOff(ctx, orgID, id, actorID, "denied", dto.Note, "time_off.denied")
}

func (s *Service) reviewTimeOff(
	ctx context.Context,
	orgID, id uuid.UUID,
	actorID *uuid.UUID,
	status, note, auditAction string,
) (*TimeOffRequest, error) {
	row, err := s.repo.GetTimeOff(ctx, orgID, id)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	if row.Status != "pending" {
		return nil, httpx.ErrConflict
	}
	now := time.Now()
	row.Status = status
	row.ReviewNote = strings.TrimSpace(note)
	row.ReviewedAt = &now
	row.ReviewedByUserID = actorID
	if err := s.repo.UpdateTimeOff(ctx, orgID, row); err != nil {
		return nil, err
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{"staff_id": row.StaffID, "status": status, "note": note})
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, auditAction, "time_off_request", &row.ID, meta)
	}
	return row, nil
}

// StaffHasApprovedTimeOff returns true when booking date falls in an approved leave window.
func (s *Service) StaffHasApprovedTimeOff(ctx context.Context, orgID, staffID uuid.UUID, date time.Time) (bool, error) {
	return s.repo.StaffHasApprovedTimeOff(ctx, orgID, staffID, date)
}
