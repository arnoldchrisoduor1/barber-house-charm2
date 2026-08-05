package payroll

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type AuditRecorder interface {
	RecordOrgAudit(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, metadata []byte) error
}

type Service struct {
	repo  *Repository
	audit AuditRecorder
}

func NewService(repo *Repository, audit AuditRecorder) *Service {
	return &Service{repo: repo, audit: audit}
}

func (s *Service) recordAudit(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, meta map[string]any) {
	if s.audit == nil {
		return
	}
	raw, _ := json.Marshal(meta)
	_ = s.audit.RecordOrgAudit(ctx, orgID, userID, action, entityType, entityID, raw)
}

// RecordCommissionLine writes the immutable per-ticket commission line for a completed
// sale. Idempotent on transaction_id (kind=service) — a retried/duplicate completion call
// does not double-credit the barber. Called by the POS service right after checkout.
func (s *Service) RecordCommissionLine(ctx context.Context, orgID, staffID uuid.UUID, txID uuid.UUID, bookingID *uuid.UUID, serviceID *uuid.UUID, baseKES int64) error {
	rate, err := s.repo.ResolveCommissionRate(ctx, orgID, staffID, serviceID)
	if err != nil {
		return fmt.Errorf("resolve commission rate: %w", err)
	}
	amount := int64(float64(baseKES) * rate / 100)
	line := &CommissionLine{
		OrganizationID: orgID,
		StaffID:        staffID,
		TransactionID:  &txID,
		BookingID:      bookingID,
		Kind:           CommissionLineKindService,
		BaseKES:        baseKES,
		RatePct:        rate,
		AmountKES:      amount,
	}
	created, err := s.repo.CreateCommissionLine(ctx, line)
	if err != nil {
		return fmt.Errorf("create commission line: %w", err)
	}
	if created {
		s.recordAudit(ctx, orgID, nil, "commission.line_created", "commission_line", &line.ID, map[string]any{
			"staff_id": staffID, "transaction_id": txID, "amount_kes": amount, "rate_pct": rate,
		})
	}
	return nil
}

// ReverseCommissionLine writes a negative adjustment line offsetting an existing service
// line. The original line is never edited or deleted — see B2-03.
func (s *Service) ReverseCommissionLine(ctx context.Context, orgID uuid.UUID, lineID uuid.UUID, reason string, actorID *uuid.UUID) (*CommissionLine, error) {
	original, err := s.repo.GetCommissionLine(ctx, orgID, lineID)
	if err != nil {
		return nil, err
	}
	adj := &CommissionLine{
		OrganizationID:  orgID,
		StaffID:         original.StaffID,
		TransactionID:   original.TransactionID,
		BookingID:       original.BookingID,
		Kind:            CommissionLineKindAdjustment,
		BaseKES:         -original.BaseKES,
		RatePct:         original.RatePct,
		AmountKES:       -original.AmountKES,
		ReversedLineID:  &original.ID,
		Note:            reason,
		CreatedByUserID: actorID,
	}
	if _, err := s.repo.CreateCommissionLine(ctx, adj); err != nil {
		return nil, fmt.Errorf("create adjustment line: %w", err)
	}
	s.recordAudit(ctx, orgID, actorID, "commission.line_reversed", "commission_line", &adj.ID, map[string]any{
		"reversed_line_id": original.ID, "amount_kes": adj.AmountKES, "reason": reason,
	})
	return adj, nil
}

func (s *Service) ListCommissionLines(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID, period string) ([]CommissionLine, error) {
	start, end := periodRange(period)
	return s.repo.ListCommissionLines(ctx, orgID, staffID, start, end)
}

func periodRange(period string) (time.Time, time.Time) {
	end := time.Now()
	start := end.AddDate(0, -1, 0)
	if period == "quarter" {
		start = end.AddDate(0, -3, 0)
	}
	return start, end
}

type CommissionRuleDTO struct {
	StaffID   uuid.UUID  `json:"staff_id"`
	ServiceID *uuid.UUID `json:"service_id"`
	RatePct   float64    `json:"rate_pct"`
}

func (s *Service) ListRules(ctx context.Context, orgID uuid.UUID) ([]CommissionRule, error) {
	return s.repo.ListRules(ctx, orgID)
}

func (s *Service) CreateRule(ctx context.Context, orgID uuid.UUID, dto CommissionRuleDTO) (*CommissionRule, error) {
	row := &CommissionRule{
		OrganizationID: orgID,
		StaffID:        dto.StaffID,
		ServiceID:      dto.ServiceID,
		RatePct:        dto.RatePct,
	}
	if err := s.repo.CreateRule(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateRule(ctx context.Context, orgID, id uuid.UUID, dto CommissionRuleDTO) (*CommissionRule, error) {
	rules, err := s.repo.ListRules(ctx, orgID)
	if err != nil {
		return nil, err
	}
	var row *CommissionRule
	for i := range rules {
		if rules[i].ID == id {
			row = &rules[i]
			break
		}
	}
	if row == nil {
		return nil, err
	}
	row.StaffID = dto.StaffID
	row.ServiceID = dto.ServiceID
	row.RatePct = dto.RatePct
	if err := s.repo.UpdateRule(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteRule(ctx context.Context, orgID, id uuid.UUID) error {
	return s.repo.DeleteRule(ctx, orgID, id)
}

// CommissionSummary sums immutable commission_lines per staff for the period — not a live
// recompute off transactions, so a later rate change never retroactively changes history.
func (s *Service) CommissionSummary(ctx context.Context, orgID uuid.UUID, period string) ([]CommissionLineSummaryRow, error) {
	start, end := periodRange(period)
	return s.repo.CommissionLineSummary(ctx, orgID, start, end)
}

type PayslipDTO struct {
	StaffID       uuid.UUID `json:"staff_id"`
	PeriodStart   string    `json:"period_start"`
	PeriodEnd     string    `json:"period_end"`
	GrossKES      int64     `json:"gross_kes"`
	CommissionKES int64     `json:"commission_kes"`
	DeductionsKES int64     `json:"deductions_kes"`
}

func (s *Service) ListPayslips(ctx context.Context, orgID uuid.UUID) ([]Payslip, error) {
	return s.repo.ListPayslips(ctx, orgID)
}

func (s *Service) CreatePayslip(ctx context.Context, orgID uuid.UUID, dto PayslipDTO) (*Payslip, error) {
	ps, err := time.Parse("2006-01-02", dto.PeriodStart)
	if err != nil {
		return nil, fmt.Errorf("invalid period_start")
	}
	pe, err := time.Parse("2006-01-02", dto.PeriodEnd)
	if err != nil {
		return nil, fmt.Errorf("invalid period_end")
	}
	daysWorked, err := s.repo.CountAttendanceDays(ctx, orgID, dto.StaffID, ps, pe)
	if err != nil {
		return nil, err
	}
	commissionKES := dto.CommissionKES
	if commissionKES == 0 {
		commissionKES, err = s.repo.SumCommissionForStaff(ctx, orgID, dto.StaffID, ps, pe.Add(24*time.Hour))
		if err != nil {
			return nil, err
		}
	}
	net := dto.GrossKES + commissionKES - dto.DeductionsKES
	row := &Payslip{
		OrganizationID: orgID,
		StaffID:        dto.StaffID,
		PeriodStart:    ps,
		PeriodEnd:      pe,
		GrossKES:       dto.GrossKES,
		CommissionKES:  commissionKES,
		DeductionsKES:  dto.DeductionsKES,
		NetKES:         net,
		DaysWorked:     daysWorked,
		Status:         "generated",
	}
	if err := s.repo.CreatePayslip(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) ExportPayslipsCSV(ctx context.Context, orgID uuid.UUID) ([]byte, error) {
	rows, err := s.repo.ListPayslips(ctx, orgID)
	if err != nil {
		return nil, err
	}
	var b strings.Builder
	b.WriteString("staff_id,period_start,period_end,gross_kes,commission_kes,deductions_kes,net_kes,days_worked,status\n")
	for _, p := range rows {
		b.WriteString(fmt.Sprintf("%s,%s,%s,%d,%d,%d,%d,%d,%s\n",
			p.StaffID, p.PeriodStart.Format("2006-01-02"), p.PeriodEnd.Format("2006-01-02"),
			p.GrossKES, p.CommissionKES, p.DeductionsKES, p.NetKES, p.DaysWorked, p.Status))
	}
	return []byte(b.String()), nil
}

func (s *Service) GetPayslip(ctx context.Context, orgID, id uuid.UUID) (*Payslip, error) {
	return s.repo.GetPayslip(ctx, orgID, id)
}
