package analytics

import (
	"context"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Reports(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) (*ReportsSummary, error) {
	return s.repo.ReportsSummary(ctx, orgID, branchID)
}

func (s *Service) Scorecards(ctx context.Context, orgID uuid.UUID) ([]ScorecardRow, error) {
	return s.repo.Scorecards(ctx, orgID)
}

func (s *Service) RevenueForecast(ctx context.Context, orgID uuid.UUID) ([]RevenueForecastPoint, error) {
	return s.repo.RevenueForecast(ctx, orgID)
}

func (s *Service) CallCentre(ctx context.Context, orgID uuid.UUID) (*CallCentreStats, error) {
	return s.repo.CallCentreStats(ctx, orgID)
}

func (s *Service) MyEarnings(ctx context.Context, orgID, staffID uuid.UUID) (*MyEarningsRow, error) {
	return s.repo.MyEarnings(ctx, orgID, staffID)
}

func (s *Service) RevenueChart(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID, days int) ([]RevenueChartPoint, error) {
	return s.repo.RevenueChart(ctx, orgID, branchID, days)
}

func (s *Service) PaymentMethods(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]PaymentMethodRow, error) {
	return s.repo.PaymentMethods(ctx, orgID, branchID)
}

func (s *Service) TopServices(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID, limit int) ([]TopServiceRow, error) {
	return s.repo.TopServices(ctx, orgID, branchID, limit)
}

func (s *Service) StaffLeaderboard(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]StaffLeaderboardRow, error) {
	return s.repo.StaffLeaderboard(ctx, orgID, branchID)
}

func (s *Service) DashboardExtras(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) (*DashboardExtras, error) {
	return s.repo.DashboardExtras(ctx, orgID, branchID)
}

func (s *Service) StaffIDForUser(ctx context.Context, orgID, userID uuid.UUID) (uuid.UUID, error) {
	return s.repo.StaffIDForUser(ctx, orgID, userID)
}
