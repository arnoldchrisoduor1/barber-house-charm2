package mobile

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type CoverageZoneDTO struct {
	Name         string   `json:"name"`
	City         string   `json:"city"`
	RadiusKm     *float64 `json:"radius_km"`
	SurchargeKES *int     `json:"surcharge_kes"`
	IsActive     *bool    `json:"is_active"`
}

type FieldJobDTO struct {
	BookingID      *uuid.UUID `json:"booking_id"`
	StaffID        *uuid.UUID `json:"staff_id"`
	CoverageZoneID *uuid.UUID `json:"coverage_zone_id"`
	Status         string     `json:"status"`
	VisitAddress   string     `json:"visit_address"`
	Notes          string     `json:"notes"`
	ScheduledAt    *string    `json:"scheduled_at"`
}

type AdvanceStatusDTO struct {
	Status string `json:"status"`
}

var statusAdvance = map[string]string{
	"assigned": "en_route",
	"en_route": "on_site",
	"on_site":  "done",
}

func (s *Service) ListZones(ctx context.Context, orgID uuid.UUID) ([]CoverageZone, error) {
	return s.repo.ListZones(ctx, orgID)
}

func (s *Service) GetZone(ctx context.Context, orgID, id uuid.UUID) (*CoverageZone, error) {
	row, err := s.repo.GetZone(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) CreateZone(ctx context.Context, orgID uuid.UUID, dto CoverageZoneDTO) (*CoverageZone, error) {
	if dto.Name == "" {
		return nil, httpx.ErrConflict
	}
	row := &CoverageZone{
		OrganizationID: orgID,
		Name:           dto.Name,
		City:           dto.City,
		IsActive:       true,
	}
	if dto.RadiusKm != nil {
		row.RadiusKm = *dto.RadiusKm
	}
	if dto.SurchargeKES != nil {
		row.SurchargeKES = *dto.SurchargeKES
	}
	if dto.IsActive != nil {
		row.IsActive = *dto.IsActive
	}
	if err := s.repo.CreateZone(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateZone(ctx context.Context, orgID, id uuid.UUID, dto CoverageZoneDTO) (*CoverageZone, error) {
	row, err := s.GetZone(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Name != "" {
		row.Name = dto.Name
	}
	row.City = dto.City
	if dto.RadiusKm != nil {
		row.RadiusKm = *dto.RadiusKm
	}
	if dto.SurchargeKES != nil {
		row.SurchargeKES = *dto.SurchargeKES
	}
	if dto.IsActive != nil {
		row.IsActive = *dto.IsActive
	}
	if err := s.repo.UpdateZone(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteZone(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetZone(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteZone(ctx, orgID, id)
}

func (s *Service) ListJobs(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID, status string) ([]FieldJob, error) {
	return s.repo.ListJobs(ctx, orgID, staffID, status)
}

func (s *Service) GetJob(ctx context.Context, orgID, id uuid.UUID) (*FieldJob, error) {
	row, err := s.repo.GetJob(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func parseScheduledAt(raw *string) (*time.Time, error) {
	if raw == nil || *raw == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, *raw)
	if err != nil {
		t2, err2 := time.Parse("2006-01-02T15:04", *raw)
		if err2 != nil {
			return nil, httpx.ErrConflict
		}
		t = t2
	}
	return &t, nil
}

func (s *Service) CreateJob(ctx context.Context, orgID uuid.UUID, dto FieldJobDTO) (*FieldJob, error) {
	status := dto.Status
	if status == "" {
		status = "assigned"
	}
	if !validJobStatus(status) {
		return nil, httpx.ErrConflict
	}
	scheduledAt, err := parseScheduledAt(dto.ScheduledAt)
	if err != nil {
		return nil, err
	}
	row := &FieldJob{
		OrganizationID: orgID,
		BookingID:      dto.BookingID,
		StaffID:        dto.StaffID,
		CoverageZoneID: dto.CoverageZoneID,
		Status:         status,
		VisitAddress:   dto.VisitAddress,
		Notes:          dto.Notes,
		ScheduledAt:    scheduledAt,
	}
	if err := s.repo.CreateJob(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateJob(ctx context.Context, orgID, id uuid.UUID, dto FieldJobDTO) (*FieldJob, error) {
	row, err := s.GetJob(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.BookingID != nil {
		row.BookingID = dto.BookingID
	}
	if dto.StaffID != nil {
		row.StaffID = dto.StaffID
	}
	if dto.CoverageZoneID != nil {
		row.CoverageZoneID = dto.CoverageZoneID
	}
	if dto.VisitAddress != "" || dto.Notes != "" || dto.ScheduledAt != nil {
		if dto.VisitAddress != "" {
			row.VisitAddress = dto.VisitAddress
		}
		row.Notes = dto.Notes
		scheduledAt, err := parseScheduledAt(dto.ScheduledAt)
		if err != nil {
			return nil, err
		}
		if dto.ScheduledAt != nil {
			row.ScheduledAt = scheduledAt
		}
	}
	if dto.Status != "" {
		if !validJobStatus(dto.Status) {
			return nil, httpx.ErrConflict
		}
		row.Status = dto.Status
	}
	if err := s.repo.UpdateJob(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) AdvanceJob(ctx context.Context, orgID, id uuid.UUID, dto AdvanceStatusDTO) (*FieldJob, error) {
	row, err := s.GetJob(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	next, ok := statusAdvance[row.Status]
	if !ok {
		return nil, httpx.ErrConflict
	}
	if dto.Status != "" && dto.Status != next {
		return nil, httpx.ErrConflict
	}
	now := time.Now().UTC()
	row.Status = next
	switch next {
	case "en_route", "on_site":
		if row.StartedAt == nil {
			row.StartedAt = &now
		}
	case "done":
		row.CompletedAt = &now
	}
	if err := s.repo.UpdateJob(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteJob(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetJob(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteJob(ctx, orgID, id)
}

func validJobStatus(status string) bool {
	switch status {
	case "assigned", "en_route", "on_site", "done", "cancelled":
		return true
	default:
		return false
	}
}
