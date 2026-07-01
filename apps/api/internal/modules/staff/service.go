package staff

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type CreateStaffDTO struct {
	DisplayName    string     `json:"display_name"`
	Title          string     `json:"title"`
	Email          string     `json:"email"`
	Phone          string     `json:"phone"`
	Role           string     `json:"role"`
	Bio            string     `json:"bio"`
	Specialties    []string   `json:"specialties"`
	CommissionRate float64    `json:"commission_rate"`
	BranchID       *uuid.UUID `json:"branch_id"`
	UserID         *uuid.UUID `json:"user_id"`
}

type UpdateStaffDTO struct {
	DisplayName    *string    `json:"display_name"`
	Title          *string    `json:"title"`
	Email          *string    `json:"email"`
	Phone          *string    `json:"phone"`
	Role           *string    `json:"role"`
	Bio            *string    `json:"bio"`
	Specialties    []string   `json:"specialties"`
	CommissionRate *float64   `json:"commission_rate"`
	BranchID       *uuid.UUID `json:"branch_id"`
	UserID         *uuid.UUID `json:"user_id"`
	IsActive       *bool      `json:"is_active"`
}

type ScheduleDTO struct {
	StaffID      uuid.UUID  `json:"staff_id"`
	BranchID     *uuid.UUID `json:"branch_id"`
	ScheduleDate string     `json:"schedule_date"`
	StartTime    string     `json:"start_time"`
	EndTime      string     `json:"end_time"`
	IsDayOff     bool       `json:"is_day_off"`
	Notes        string     `json:"notes"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) ([]Staff, error) {
	return s.repo.List(ctx, orgID, branchID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Staff, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto CreateStaffDTO) (*Staff, error) {
	m := &Staff{
		OrganizationID: orgID,
		UserID:         dto.UserID,
		BranchID:       dto.BranchID,
		DisplayName:    dto.DisplayName,
		Title:          dto.Title,
		Email:          dto.Email,
		Phone:          dto.Phone,
		Role:           dto.Role,
		Bio:            dto.Bio,
		Specialties:    pq.StringArray(dto.Specialties),
		CommissionRate: dto.CommissionRate,
		IsActive:       true,
	}
	if err := s.repo.Create(ctx, m); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *Service) Update(ctx context.Context, orgID, id uuid.UUID, dto UpdateStaffDTO) (*Staff, error) {
	m, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.DisplayName != nil {
		m.DisplayName = *dto.DisplayName
	}
	if dto.Title != nil {
		m.Title = *dto.Title
	}
	if dto.Email != nil {
		m.Email = *dto.Email
	}
	if dto.Phone != nil {
		m.Phone = *dto.Phone
	}
	if dto.Role != nil {
		m.Role = *dto.Role
	}
	if dto.Bio != nil {
		m.Bio = *dto.Bio
	}
	if dto.Specialties != nil {
		m.Specialties = pq.StringArray(dto.Specialties)
	}
	if dto.CommissionRate != nil {
		m.CommissionRate = *dto.CommissionRate
	}
	if dto.BranchID != nil {
		m.BranchID = dto.BranchID
	}
	if dto.UserID != nil {
		m.UserID = dto.UserID
	}
	if dto.IsActive != nil {
		m.IsActive = *dto.IsActive
	}
	if err := s.repo.Update(ctx, orgID, m); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *Service) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.Get(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.SoftDelete(ctx, orgID, id)
}

func (s *Service) ListSchedules(ctx context.Context, orgID uuid.UUID) ([]StaffSchedule, error) {
	return s.repo.ListSchedules(ctx, orgID)
}

func (s *Service) GetSchedule(ctx context.Context, orgID, id uuid.UUID) (*StaffSchedule, error) {
	row, err := s.repo.GetSchedule(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) CreateSchedule(ctx context.Context, orgID uuid.UUID, dto ScheduleDTO) (*StaffSchedule, error) {
	row := &StaffSchedule{
		OrganizationID: orgID,
		StaffID:        dto.StaffID,
		BranchID:       dto.BranchID,
		ScheduleDate:   dto.ScheduleDate,
		StartTime:      dto.StartTime,
		EndTime:        dto.EndTime,
		IsDayOff:       dto.IsDayOff,
		Notes:          dto.Notes,
	}
	if row.StartTime == "" {
		row.StartTime = "08:00"
	}
	if row.EndTime == "" {
		row.EndTime = "20:00"
	}
	if err := s.repo.CreateSchedule(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateSchedule(ctx context.Context, orgID, id uuid.UUID, dto ScheduleDTO) (*StaffSchedule, error) {
	row, err := s.GetSchedule(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	row.StaffID = dto.StaffID
	row.BranchID = dto.BranchID
	row.ScheduleDate = dto.ScheduleDate
	if dto.StartTime != "" {
		row.StartTime = dto.StartTime
	}
	if dto.EndTime != "" {
		row.EndTime = dto.EndTime
	}
	row.IsDayOff = dto.IsDayOff
	row.Notes = dto.Notes
	if err := s.repo.UpdateSchedule(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteSchedule(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetSchedule(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteSchedule(ctx, orgID, id)
}
