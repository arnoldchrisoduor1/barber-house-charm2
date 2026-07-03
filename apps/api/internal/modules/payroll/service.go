package payroll

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
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

func (s *Service) CommissionSummary(ctx context.Context, orgID uuid.UUID, period string) ([]CommissionSummaryRow, error) {
	end := time.Now()
	start := end.AddDate(0, -1, 0)
	if period == "quarter" {
		start = end.AddDate(0, -3, 0)
	}
	return s.repo.CommissionSummary(ctx, orgID, start, end)
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
	ps, _ := time.Parse("2006-01-02", dto.PeriodStart)
	pe, _ := time.Parse("2006-01-02", dto.PeriodEnd)
	net := dto.GrossKES + dto.CommissionKES - dto.DeductionsKES
	row := &Payslip{
		OrganizationID: orgID,
		StaffID:        dto.StaffID,
		PeriodStart:    ps,
		PeriodEnd:      pe,
		GrossKES:       dto.GrossKES,
		CommissionKES:  dto.CommissionKES,
		DeductionsKES:  dto.DeductionsKES,
		NetKES:         net,
		Status:         "generated",
	}
	if err := s.repo.CreatePayslip(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) GetPayslip(ctx context.Context, orgID, id uuid.UUID) (*Payslip, error) {
	return s.repo.GetPayslip(ctx, orgID, id)
}
