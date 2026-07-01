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
