package settings

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type CustomerFinder interface {
	FindOrCreateByPhone(ctx context.Context, orgID uuid.UUID, fullName, phone string) (uuid.UUID, error)
}

type BookingCreator interface {
	CreateFromEnquiry(ctx context.Context, orgID, customerID uuid.UUID, staffID *uuid.UUID, bookingDate, startTime, endTime, notes string) (uuid.UUID, error)
}

type ConvertEnquiryDTO struct {
	StaffID     *uuid.UUID `json:"staff_id"`
	BookingDate string     `json:"booking_date"`
	StartTime   string     `json:"start_time"`
	EndTime     string     `json:"end_time"`
	Notes       string     `json:"notes"`
}

func (s *Service) SetEnquiryIntegrations(customers CustomerFinder, bookings BookingCreator) {
	s.customers = customers
	s.bookings = bookings
}

func (s *Service) MarkEnquiryRead(ctx context.Context, orgID, id uuid.UUID) (*Enquiry, error) {
	row, err := s.GetEnquiry(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	row.IsRead = true
	row.UpdatedAt = time.Now()
	if err := s.repo.UpdateEnquiry(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) CreateDeskEnquiry(ctx context.Context, orgID uuid.UUID, dto EnquiryDTO) (*Enquiry, error) {
	row := &Enquiry{
		OrganizationID: orgID,
		BranchID:       dto.BranchID,
		Name:           dto.Name,
		Email:          dto.Email,
		Phone:          dto.Phone,
		Subject:        dto.Subject,
		Message:        dto.Message,
		Source:         "desk",
		Status:         "open",
	}
	if row.Subject == "" {
		row.Subject = "Walk-in / phone enquiry"
	}
	if row.Message == "" {
		row.Message = row.Subject
	}
	if err := s.repo.CreateEnquiry(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) ConvertEnquiryToBooking(ctx context.Context, orgID, id uuid.UUID, dto ConvertEnquiryDTO) (*Enquiry, error) {
	if s.customers == nil || s.bookings == nil {
		return nil, httpx.ErrConflict
	}
	row, err := s.GetEnquiry(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if row.ConvertedBookingID != nil {
		return nil, httpx.ErrConflict
	}
	if dto.BookingDate == "" || dto.StartTime == "" || dto.EndTime == "" {
		return nil, httpx.ErrConflict
	}
	phone := row.Phone
	if phone == "" {
		phone = "+254700000000"
	}
	customerID, err := s.customers.FindOrCreateByPhone(ctx, orgID, row.Name, phone)
	if err != nil {
		return nil, err
	}
	notes := dto.Notes
	if notes == "" {
		notes = "Converted from enquiry: " + row.Subject
	}
	bookingID, err := s.bookings.CreateFromEnquiry(ctx, orgID, customerID, dto.StaffID, dto.BookingDate, dto.StartTime, dto.EndTime, notes)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	row.CustomerID = &customerID
	row.ConvertedBookingID = &bookingID
	row.Status = "converted"
	row.IsRead = true
	row.UpdatedAt = now
	if err := s.repo.UpdateEnquiry(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}
