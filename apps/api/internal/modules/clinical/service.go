package clinical

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

type PatientIntakeDTO struct {
	CustomerID            uuid.UUID `json:"customer_id"`
	MedicalHistory        string    `json:"medical_history"`
	Allergies             string    `json:"allergies"`
	Medications           string    `json:"medications"`
	EmergencyContactName  string    `json:"emergency_contact_name"`
	EmergencyContactPhone string    `json:"emergency_contact_phone"`
	ConsentGiven          *bool     `json:"consent_given"`
	Notes                 string    `json:"notes"`
}

type AftercareDTO struct {
	Title         string     `json:"title"`
	Body          string     `json:"body"`
	ProcedureName string     `json:"procedure_name"`
	BookingID     *uuid.UUID `json:"booking_id"`
	FollowUpAt    *string    `json:"follow_up_at"`
	IsTemplate    *bool      `json:"is_template"`
}

func (s *Service) ListIntake(ctx context.Context, orgID uuid.UUID, customerID *uuid.UUID) ([]PatientIntake, error) {
	return s.repo.ListIntake(ctx, orgID, customerID)
}

func (s *Service) GetIntake(ctx context.Context, orgID, id uuid.UUID) (*PatientIntake, error) {
	row, err := s.repo.GetIntake(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) CreateIntake(ctx context.Context, orgID uuid.UUID, dto PatientIntakeDTO) (*PatientIntake, error) {
	if dto.CustomerID == uuid.Nil {
		return nil, httpx.ErrConflict
	}
	row := &PatientIntake{
		OrganizationID:        orgID,
		CustomerID:            dto.CustomerID,
		MedicalHistory:        dto.MedicalHistory,
		Allergies:             dto.Allergies,
		Medications:           dto.Medications,
		EmergencyContactName:  dto.EmergencyContactName,
		EmergencyContactPhone: dto.EmergencyContactPhone,
		Notes:                 dto.Notes,
	}
	if dto.ConsentGiven != nil {
		row.ConsentGiven = *dto.ConsentGiven
	}
	if err := s.repo.CreateIntake(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateIntake(ctx context.Context, orgID, id uuid.UUID, dto PatientIntakeDTO) (*PatientIntake, error) {
	row, err := s.GetIntake(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.CustomerID != uuid.Nil {
		row.CustomerID = dto.CustomerID
	}
	row.MedicalHistory = dto.MedicalHistory
	row.Allergies = dto.Allergies
	row.Medications = dto.Medications
	row.EmergencyContactName = dto.EmergencyContactName
	row.EmergencyContactPhone = dto.EmergencyContactPhone
	row.Notes = dto.Notes
	if dto.ConsentGiven != nil {
		row.ConsentGiven = *dto.ConsentGiven
	}
	if err := s.repo.UpdateIntake(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteIntake(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetIntake(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteIntake(ctx, orgID, id)
}

func (s *Service) ListAftercare(ctx context.Context, orgID uuid.UUID) ([]AftercareInstruction, error) {
	return s.repo.ListAftercare(ctx, orgID)
}

func (s *Service) GetAftercare(ctx context.Context, orgID, id uuid.UUID) (*AftercareInstruction, error) {
	row, err := s.repo.GetAftercare(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) CreateAftercare(ctx context.Context, orgID uuid.UUID, dto AftercareDTO) (*AftercareInstruction, error) {
	if dto.Title == "" {
		return nil, httpx.ErrConflict
	}
	row := &AftercareInstruction{
		OrganizationID: orgID,
		Title:          dto.Title,
		Body:           dto.Body,
		ProcedureName:  dto.ProcedureName,
		BookingID:      dto.BookingID,
		IsTemplate:     true,
	}
	if dto.IsTemplate != nil {
		row.IsTemplate = *dto.IsTemplate
	}
	if dto.FollowUpAt != nil && *dto.FollowUpAt != "" {
		d, err := time.Parse("2006-01-02", *dto.FollowUpAt)
		if err != nil {
			return nil, httpx.ErrConflict
		}
		row.FollowUpAt = &d
	}
	if err := s.repo.CreateAftercare(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateAftercare(ctx context.Context, orgID, id uuid.UUID, dto AftercareDTO) (*AftercareInstruction, error) {
	row, err := s.GetAftercare(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Title != "" {
		row.Title = dto.Title
	}
	row.Body = dto.Body
	row.ProcedureName = dto.ProcedureName
	row.BookingID = dto.BookingID
	if dto.IsTemplate != nil {
		row.IsTemplate = *dto.IsTemplate
	}
	if dto.FollowUpAt != nil {
		if *dto.FollowUpAt == "" {
			row.FollowUpAt = nil
		} else {
			d, err := time.Parse("2006-01-02", *dto.FollowUpAt)
			if err != nil {
				return nil, httpx.ErrConflict
			}
			row.FollowUpAt = &d
		}
	}
	if err := s.repo.UpdateAftercare(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteAftercare(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetAftercare(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteAftercare(ctx, orgID, id)
}
