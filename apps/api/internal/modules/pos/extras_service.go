package pos

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type TipDTO struct {
	StaffID       uuid.UUID  `json:"staff_id"`
	CustomerID    *uuid.UUID `json:"customer_id"`
	BookingID     *uuid.UUID `json:"booking_id"`
	TransactionID *uuid.UUID `json:"transaction_id"`
	AmountKES     int        `json:"amount_kes"`
	Status        string     `json:"status"`
	PaymentMethod string     `json:"payment_method"`
	TipDate       string     `json:"tip_date"`
	Notes         string     `json:"notes"`
}

func (s *Service) ListTips(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Tip, error) {
	return s.repo.ListTips(ctx, orgID, branchID)
}

func (s *Service) CreateTip(ctx context.Context, orgID uuid.UUID, dto TipDTO) (*Tip, error) {
	date := time.Now()
	if dto.TipDate != "" {
		if d, err := time.Parse("2006-01-02", dto.TipDate); err == nil {
			date = d
		}
	}
	status := dto.Status
	if status == "" {
		status = "pending"
	}
	row := &Tip{
		OrganizationID: orgID,
		StaffID:        dto.StaffID,
		CustomerID:     dto.CustomerID,
		BookingID:      dto.BookingID,
		TransactionID:  dto.TransactionID,
		AmountKES:      dto.AmountKES,
		Status:         status,
		PaymentMethod:  dto.PaymentMethod,
		TipDate:        date,
		Notes:          dto.Notes,
	}
	if err := s.repo.CreateTip(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateTip(ctx context.Context, orgID, id uuid.UUID, dto TipDTO) (*Tip, error) {
	row, err := s.repo.GetTip(ctx, orgID, id)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	row.AmountKES = dto.AmountKES
	row.Status = dto.Status
	row.Notes = dto.Notes
	if err := s.repo.UpdateTip(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteTip(ctx context.Context, orgID, id uuid.UUID) error {
	return s.repo.DeleteTip(ctx, orgID, id)
}

type OpenShiftDTO struct {
	BranchID        *uuid.UUID `json:"branch_id"`
	StaffID         uuid.UUID  `json:"staff_id"`
	OpeningFloatKES int        `json:"opening_float_kes"`
}

type CloseShiftDTO struct {
	ClosingCountKES int `json:"closing_count_kes"`
}

func (s *Service) ActiveShift(ctx context.Context, orgID, staffID uuid.UUID) (*PosShift, error) {
	return s.repo.ActiveShift(ctx, orgID, staffID)
}

func (s *Service) OpenShift(ctx context.Context, orgID uuid.UUID, dto OpenShiftDTO) (*PosShift, error) {
	active, err := s.repo.ActiveShift(ctx, orgID, dto.StaffID)
	if err != nil {
		return nil, err
	}
	if active != nil {
		return active, nil
	}
	row := &PosShift{
		OrganizationID:  orgID,
		BranchID:        dto.BranchID,
		StaffID:         dto.StaffID,
		OpeningFloatKES: dto.OpeningFloatKES,
		OpenedAt:        time.Now(),
	}
	if err := s.repo.OpenShift(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) CloseShift(ctx context.Context, orgID, shiftID uuid.UUID, dto CloseShiftDTO) (*PosShift, error) {
	row, err := s.repo.GetShift(ctx, orgID, shiftID)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	now := time.Now()
	row.ClosingCountKES = &dto.ClosingCountKES
	variance := dto.ClosingCountKES - row.OpeningFloatKES
	row.VarianceKES = &variance
	row.ClosedAt = &now
	if err := s.repo.CloseShift(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}
