package booking

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type AuditRecorder interface {
	RecordOrgAudit(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, metadata []byte) error
}

type OrganizationBookingPolicy struct {
	OrganizationID    uuid.UUID `json:"organization_id" gorm:"type:uuid;primaryKey"`
	DepositsEnabled   bool      `json:"deposits_enabled" gorm:"not null;default:false"`
	DepositType       string    `json:"deposit_type" gorm:"not null;default:percent"`
	DepositAmount     int       `json:"deposit_amount" gorm:"not null;default:25"`
	RefundWindowHours int       `json:"refund_window_hours" gorm:"not null;default:24"`
	LateCancelFeeKES  int64     `json:"late_cancel_fee_kes" gorm:"not null;default:0"`
	LateCancelHours   int       `json:"late_cancel_hours" gorm:"not null;default:24"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (OrganizationBookingPolicy) TableName() string { return "organization_booking_policies" }

type BookingDeposit struct {
	database.Base
	OrganizationID uuid.UUID `json:"organization_id" gorm:"type:uuid;not null;index"`
	BookingID      uuid.UUID `json:"booking_id" gorm:"type:uuid;not null;uniqueIndex"`
	CustomerID     uuid.UUID `json:"customer_id" gorm:"type:uuid;not null;index"`
	AmountKES      int64     `json:"amount_kes" gorm:"not null"`
	Status         string    `json:"status" gorm:"not null;default:pending"`
	PaymentRef     string    `json:"payment_ref,omitempty"`
}

func (BookingDeposit) TableName() string { return "booking_deposits" }
func (BookingDeposit) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*BookingDeposit)(nil)

type BookingPolicyDTO struct {
	DepositsEnabled   bool   `json:"deposits_enabled"`
	DepositType       string `json:"deposit_type"`
	DepositAmount     int    `json:"deposit_amount"`
	RefundWindowHours int    `json:"refund_window_hours"`
	LateCancelFeeKES  int64  `json:"late_cancel_fee_kes"`
	LateCancelHours   int    `json:"late_cancel_hours"`
}

type PatchStatusResult struct {
	Booking            *Booking `json:"booking"`
	CancellationFeeKES int64    `json:"cancellation_fee_kes,omitempty"`
}

func computeDepositAmount(policy *OrganizationBookingPolicy, serviceTotalKES int) int64 {
	if policy == nil || !policy.DepositsEnabled || serviceTotalKES <= 0 {
		return 0
	}
	switch policy.DepositType {
	case "fixed":
		if policy.DepositAmount <= 0 {
			return 0
		}
		return int64(policy.DepositAmount)
	default:
		if policy.DepositAmount <= 0 {
			return 0
		}
		return int64(serviceTotalKES * policy.DepositAmount / 100)
	}
}

func (s *Service) GetBookingPolicy(ctx context.Context, orgID uuid.UUID) (*OrganizationBookingPolicy, error) {
	row, err := s.repo.GetBookingPolicy(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if row != nil {
		return row, nil
	}
	return &OrganizationBookingPolicy{
		OrganizationID:    orgID,
		DepositType:       "percent",
		DepositAmount:     25,
		RefundWindowHours: 24,
		LateCancelHours:   24,
	}, nil
}

func (s *Service) UpdateBookingPolicy(ctx context.Context, orgID uuid.UUID, dto BookingPolicyDTO) (*OrganizationBookingPolicy, error) {
	if dto.DepositType != "" && dto.DepositType != "percent" && dto.DepositType != "fixed" {
		return nil, httpx.ErrConflict
	}
	row := &OrganizationBookingPolicy{
		OrganizationID:    orgID,
		DepositsEnabled:   dto.DepositsEnabled,
		DepositType:       dto.DepositType,
		DepositAmount:     dto.DepositAmount,
		RefundWindowHours: dto.RefundWindowHours,
		LateCancelFeeKES:  dto.LateCancelFeeKES,
		LateCancelHours:   dto.LateCancelHours,
	}
	if row.DepositType == "" {
		row.DepositType = "percent"
	}
	if row.RefundWindowHours <= 0 {
		row.RefundWindowHours = 24
	}
	if row.LateCancelHours <= 0 {
		row.LateCancelHours = 24
	}
	if err := s.repo.UpsertBookingPolicy(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) ListBookingDeposits(ctx context.Context, orgID uuid.UUID) ([]BookingDeposit, error) {
	return s.repo.ListBookingDeposits(ctx, orgID)
}

func (s *Service) CollectBookingDeposit(ctx context.Context, orgID, bookingID uuid.UUID, paymentRef string) (*BookingDeposit, error) {
	if _, err := s.repo.Get(ctx, orgID, bookingID); err != nil {
		return nil, httpx.ErrNotFound
	}
	dep, err := s.repo.GetBookingDepositByBooking(ctx, orgID, bookingID)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	if dep.Status == "paid" {
		return dep, nil
	}
	dep.Status = "paid"
	dep.PaymentRef = paymentRef
	if err := s.repo.UpdateBookingDeposit(ctx, orgID, dep); err != nil {
		return nil, err
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{"booking_id": bookingID, "amount_kes": dep.AmountKES})
		_ = s.audit.RecordOrgAudit(ctx, orgID, nil, "deposit.collected", "booking_deposit", &dep.ID, meta)
	}
	return dep, nil
}

func (s *Service) createPendingDeposit(ctx context.Context, orgID uuid.UUID, booking *Booking, serviceTotalKES int) error {
	policy, err := s.GetBookingPolicy(ctx, orgID)
	if err != nil || !policy.DepositsEnabled {
		return err
	}
	amount := computeDepositAmount(policy, serviceTotalKES)
	if amount <= 0 {
		return nil
	}
	dep := &BookingDeposit{
		OrganizationID: orgID,
		BookingID:      booking.ID,
		CustomerID:     booking.CustomerID,
		AmountKES:      amount,
		Status:         "pending",
	}
	return s.repo.CreateBookingDeposit(ctx, dep)
}

func (s *Service) applyCancellationPolicy(ctx context.Context, orgID uuid.UUID, b *Booking) (int64, error) {
	policy, err := s.GetBookingPolicy(ctx, orgID)
	if err != nil || policy.LateCancelFeeKES <= 0 {
		return 0, err
	}
	start, err := time.ParseInLocation("2006-01-02 15:04", b.BookingDate.Format("2006-01-02")+" "+normalizeTime(b.StartTime), time.UTC)
	if err != nil {
		return 0, nil
	}
	hoursUntil := start.Sub(time.Now().UTC()).Hours()
	if hoursUntil > float64(policy.LateCancelHours) {
		return 0, nil
	}
	fee := policy.LateCancelFeeKES
	if dep, _ := s.repo.GetBookingDepositByBooking(ctx, orgID, b.ID); dep != nil && dep.Status == "paid" {
		dep.Status = "forfeited"
		_ = s.repo.UpdateBookingDeposit(ctx, orgID, dep)
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{"booking_id": b.ID, "fee_kes": fee, "hours_until": hoursUntil})
		_ = s.audit.RecordOrgAudit(ctx, orgID, nil, "booking.late_cancel_fee", "booking", &b.ID, meta)
	}
	return fee, nil
}
