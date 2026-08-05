package crm

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func (r *Repository) ListPatchTests(ctx context.Context, orgID, customerID uuid.UUID) ([]CustomerPatchTest, error) {
	var rows []CustomerPatchTest
	err := r.db.WithContext(ctx).Scopes(tenancy.OrgScope(orgID)).
		Where("customer_id = ?", customerID).
		Order("performed_at DESC").
		Find(&rows).Error
	return rows, err
}

func (r *Repository) CreatePatchTest(ctx context.Context, row *CustomerPatchTest) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) ListConsultations(ctx context.Context, orgID, customerID uuid.UUID) ([]ClientConsultation, error) {
	var rows []ClientConsultation
	err := r.db.WithContext(ctx).Scopes(tenancy.OrgScope(orgID)).
		Where("customer_id = ?", customerID).
		Order("created_at DESC").
		Find(&rows).Error
	return rows, err
}

func (r *Repository) CreateConsultation(ctx context.Context, row *ClientConsultation) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (s *Service) ListPatchTests(ctx context.Context, orgID, customerID uuid.UUID) ([]CustomerPatchTest, error) {
	if _, err := s.Get(ctx, orgID, customerID); err != nil {
		return nil, err
	}
	return s.repo.ListPatchTests(ctx, orgID, customerID)
}

func (s *Service) CreatePatchTest(ctx context.Context, orgID, customerID uuid.UUID, dto CreatePatchTestDTO) (*CustomerPatchTest, error) {
	if _, err := s.Get(ctx, orgID, customerID); err != nil {
		return nil, err
	}
	performedAt := time.Now()
	if dto.PerformedAt != nil {
		performedAt = *dto.PerformedAt
	}
	result := dto.Result
	if result == "" {
		result = "pending"
	}
	testType := dto.TestType
	if testType == "" {
		testType = "colour"
	}
	expiresAt := dto.ExpiresAt
	if expiresAt == nil {
		t := performedAt.Add(42 * 24 * time.Hour)
		expiresAt = &t
	}
	row := &CustomerPatchTest{
		OrganizationID: orgID,
		CustomerID:     customerID,
		TestType:       testType,
		PerformedAt:    performedAt,
		Result:         result,
		ExpiresAt:      expiresAt,
		Notes:          dto.Notes,
	}
	if err := s.repo.CreatePatchTest(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) ListConsultations(ctx context.Context, orgID, customerID uuid.UUID) ([]ClientConsultation, error) {
	if _, err := s.Get(ctx, orgID, customerID); err != nil {
		return nil, err
	}
	return s.repo.ListConsultations(ctx, orgID, customerID)
}

func (s *Service) CreateConsultation(ctx context.Context, orgID, customerID uuid.UUID, dto CreateConsultationDTO) (*ClientConsultation, error) {
	if _, err := s.Get(ctx, orgID, customerID); err != nil {
		return nil, err
	}
	if dto.TreatmentSummary == "" {
		return nil, httpx.ErrConflict
	}
	row := &ClientConsultation{
		OrganizationID:       orgID,
		CustomerID:           customerID,
		StaffID:              dto.StaffID,
		BookingID:            dto.BookingID,
		ServiceName:          dto.ServiceName,
		TreatmentSummary:     dto.TreatmentSummary,
		SkinNotes:            dto.SkinNotes,
		ProductUsed:          dto.ProductUsed,
		NextAppointmentNotes: dto.NextAppointmentNotes,
	}
	if err := s.repo.CreateConsultation(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) LatestValidPatchTest(ctx context.Context, orgID, customerID uuid.UUID) (*CustomerPatchTest, error) {
	rows, err := s.repo.ListPatchTests(ctx, orgID, customerID)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	for i := range rows {
		if rows[i].Result != "pass" {
			continue
		}
		if rows[i].ExpiresAt != nil && rows[i].ExpiresAt.Before(now) {
			continue
		}
		return &rows[i], nil
	}
	return nil, gorm.ErrRecordNotFound
}

func (s *Service) CustomerAllergyAlert(ctx context.Context, orgID, customerID uuid.UUID) (bool, string, error) {
	c, err := s.Get(ctx, orgID, customerID)
	if err != nil {
		return false, "", err
	}
	if !c.HasAllergies {
		return false, "", nil
	}
	return true, c.AllergyNotes, nil
}
