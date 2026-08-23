package therapy

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

type SessionNoteDTO struct {
	CustomerID        uuid.UUID  `json:"customer_id"`
	StaffID           *uuid.UUID `json:"staff_id"`
	BookingID         *uuid.UUID `json:"booking_id"`
	SessionDate       string     `json:"session_date"`
	Title             string     `json:"title"`
	Content           string     `json:"content"`
	FocusArea         string     `json:"focus_area"`
	PressureLevel     string     `json:"pressure_level"`
	OilsUsed          string     `json:"oils_used"`
	Contraindications string     `json:"contraindications"`
	NextVisitNotes    string     `json:"next_visit_notes"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID, customerID *uuid.UUID) ([]SessionNote, error) {
	return s.repo.List(ctx, orgID, customerID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*SessionNote, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto SessionNoteDTO) (*SessionNote, error) {
	if dto.CustomerID == uuid.Nil || dto.SessionDate == "" {
		return nil, httpx.ErrConflict
	}
	date, err := time.Parse("2006-01-02", dto.SessionDate)
	if err != nil {
		return nil, httpx.ErrConflict
	}
	row := &SessionNote{
		OrganizationID:    orgID,
		CustomerID:        dto.CustomerID,
		StaffID:           dto.StaffID,
		BookingID:         dto.BookingID,
		SessionDate:       date,
		Title:             dto.Title,
		Content:           dto.Content,
		FocusArea:         dto.FocusArea,
		PressureLevel:     dto.PressureLevel,
		OilsUsed:          dto.OilsUsed,
		Contraindications: dto.Contraindications,
		NextVisitNotes:    dto.NextVisitNotes,
	}
	if err := s.repo.Create(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) Update(ctx context.Context, orgID, id uuid.UUID, dto SessionNoteDTO) (*SessionNote, error) {
	row, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.SessionDate != "" {
		date, err := time.Parse("2006-01-02", dto.SessionDate)
		if err != nil {
			return nil, httpx.ErrConflict
		}
		row.SessionDate = date
	}
	if dto.Title != "" {
		row.Title = dto.Title
	}
	row.Content = dto.Content
	row.FocusArea = dto.FocusArea
	row.PressureLevel = dto.PressureLevel
	row.OilsUsed = dto.OilsUsed
	row.Contraindications = dto.Contraindications
	row.NextVisitNotes = dto.NextVisitNotes
	if dto.StaffID != nil {
		row.StaffID = dto.StaffID
	}
	if dto.BookingID != nil {
		row.BookingID = dto.BookingID
	}
	if err := s.repo.Update(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.Get(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, orgID, id)
}

type ProgressDTO struct {
	CustomerID  uuid.UUID `json:"customer_id"`
	MetricName  string    `json:"metric_name"`
	MetricValue string    `json:"metric_value"`
	Notes       string    `json:"notes"`
	RecordedAt  string    `json:"recorded_at"`
}

func (s *Service) ListProgress(ctx context.Context, orgID uuid.UUID, customerID *uuid.UUID) ([]ProgressMetric, error) {
	return s.repo.ListProgress(ctx, orgID, customerID)
}

func (s *Service) GetProgress(ctx context.Context, orgID, id uuid.UUID) (*ProgressMetric, error) {
	row, err := s.repo.GetProgress(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) CreateProgress(ctx context.Context, orgID uuid.UUID, dto ProgressDTO) (*ProgressMetric, error) {
	if dto.CustomerID == uuid.Nil || dto.MetricName == "" {
		return nil, httpx.ErrConflict
	}
	recorded := time.Now()
	if dto.RecordedAt != "" {
		d, err := time.Parse("2006-01-02", dto.RecordedAt)
		if err != nil {
			return nil, httpx.ErrConflict
		}
		recorded = d
	}
	row := &ProgressMetric{
		OrganizationID: orgID,
		CustomerID:     dto.CustomerID,
		MetricName:     dto.MetricName,
		MetricValue:    dto.MetricValue,
		Notes:          dto.Notes,
		RecordedAt:     recorded,
	}
	if err := s.repo.CreateProgress(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateProgress(ctx context.Context, orgID, id uuid.UUID, dto ProgressDTO) (*ProgressMetric, error) {
	row, err := s.GetProgress(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.CustomerID != uuid.Nil {
		row.CustomerID = dto.CustomerID
	}
	if dto.MetricName != "" {
		row.MetricName = dto.MetricName
	}
	row.MetricValue = dto.MetricValue
	row.Notes = dto.Notes
	if dto.RecordedAt != "" {
		d, err := time.Parse("2006-01-02", dto.RecordedAt)
		if err != nil {
			return nil, httpx.ErrConflict
		}
		row.RecordedAt = d
	}
	if err := s.repo.UpdateProgress(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteProgress(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetProgress(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteProgress(ctx, orgID, id)
}
