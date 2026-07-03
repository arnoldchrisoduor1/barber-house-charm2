package booking

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Service struct {
	repo      *Repository
	publisher QueuePublisher
	crm       CRMRepository
}

func NewService(repo *Repository, publisher QueuePublisher, crm CRMRepository) *Service {
	return &Service{repo: repo, publisher: publisher, crm: crm}
}

type CreateBookingDTO struct {
	CustomerID  uuid.UUID  `json:"customerId"`
	StaffID     *uuid.UUID `json:"staffId"`
	BranchID    *uuid.UUID `json:"branchId"`
	BookingDate string     `json:"bookingDate"`
	StartTime   string     `json:"startTime"`
	EndTime     string     `json:"endTime"`
	Notes       string     `json:"notes"`
	IsWalkin    bool       `json:"isWalkin"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID, filter ListFilter) ([]Booking, error) {
	return s.repo.List(ctx, orgID, filter)
}

func (s *Service) ListServices(ctx context.Context, orgID, bookingID uuid.UUID) ([]BookingService, error) {
	if _, err := s.repo.Get(ctx, orgID, bookingID); err != nil {
		return nil, httpx.ErrNotFound
	}
	return s.repo.ListServices(ctx, orgID, bookingID)
}

func (s *Service) MarkCompleted(ctx context.Context, orgID, bookingID uuid.UUID) error {
	if _, err := s.repo.Get(ctx, orgID, bookingID); err != nil {
		return httpx.ErrNotFound
	}
	return s.repo.MarkCompleted(ctx, orgID, bookingID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Booking, error) {
	return s.repo.Get(ctx, orgID, id)
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto CreateBookingDTO) (*Booking, error) {
	date, err := time.Parse("2006-01-02", dto.BookingDate)
	if err != nil {
		return nil, httpx.ErrConflict
	}
	if dto.StaffID != nil {
		conflicts, err := s.repo.StaffConflicts(ctx, orgID, *dto.StaffID, date, dto.StartTime, dto.EndTime, nil)
		if err != nil {
			return nil, err
		}
		if conflicts > 0 {
			return nil, httpx.ErrConflict
		}
	}
	b := &Booking{
		OrganizationID: orgID,
		CustomerID:     dto.CustomerID,
		StaffID:        dto.StaffID,
		BranchID:       dto.BranchID,
		BookingDate:    date,
		StartTime:      dto.StartTime,
		EndTime:        dto.EndTime,
		Status:         "scheduled",
		IsWalkin:       dto.IsWalkin,
		Notes:          dto.Notes,
	}
	if err := s.repo.Create(ctx, b); err != nil {
		return nil, err
	}
	if s.publisher != nil {
		_ = s.publisher.PublishQueue(ctx, orgID, "booking.created", map[string]any{
			"booking_id":   b.ID,
			"customer_id":  b.CustomerID,
			"status":       b.Status,
			"booking_date": b.BookingDate.Format("2006-01-02"),
			"start_time":   b.StartTime,
		})
	}
	return b, nil
}

func (s *Service) Update(ctx context.Context, orgID uuid.UUID, id uuid.UUID, dto CreateBookingDTO) (*Booking, error) {
	b, err := s.repo.Get(ctx, orgID, id)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	date, err := time.Parse("2006-01-02", dto.BookingDate)
	if err != nil {
		return nil, httpx.ErrConflict
	}
	if dto.StaffID != nil {
		conflicts, err := s.repo.StaffConflicts(ctx, orgID, *dto.StaffID, date, dto.StartTime, dto.EndTime, &id)
		if err != nil {
			return nil, err
		}
		if conflicts > 0 {
			return nil, httpx.ErrConflict
		}
	}
	b.CustomerID = dto.CustomerID
	b.StaffID = dto.StaffID
	b.BranchID = dto.BranchID
	b.BookingDate = date
	b.StartTime = dto.StartTime
	b.EndTime = dto.EndTime
	b.Notes = dto.Notes
	if err := s.repo.Update(ctx, orgID, b); err != nil {
		return nil, err
	}
	return b, nil
}

func (s *Service) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	return s.repo.Delete(ctx, orgID, id)
}

type PatchStatusDTO struct {
	Status string `json:"status"`
}

func (s *Service) PatchStatus(ctx context.Context, orgID, id uuid.UUID, status string) (*Booking, error) {
	b, err := s.repo.Get(ctx, orgID, id)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	b.Status = status
	if err := s.repo.Update(ctx, orgID, b); err != nil {
		return nil, err
	}
	if s.publisher != nil {
		_ = s.publisher.PublishQueue(ctx, orgID, "queue.updated", map[string]any{
			"booking_id": id,
			"status":     status,
		})
	}
	return b, nil
}

type AvailabilityQuery struct {
	StaffID     uuid.UUID `query:"staff_id"`
	BookingDate string    `query:"booking_date"`
	StartTime   string    `query:"start_time"`
	EndTime     string    `query:"end_time"`
}

func (s *Service) CheckAvailability(ctx context.Context, orgID uuid.UUID, q AvailabilityQuery) (map[string]any, error) {
	date, err := time.Parse("2006-01-02", q.BookingDate)
	if err != nil {
		return nil, httpx.ErrConflict
	}
	conflicts, err := s.repo.StaffConflicts(ctx, orgID, q.StaffID, date, q.StartTime, q.EndTime, nil)
	if err != nil {
		return nil, err
	}
	return map[string]any{"available": conflicts == 0}, nil
}
