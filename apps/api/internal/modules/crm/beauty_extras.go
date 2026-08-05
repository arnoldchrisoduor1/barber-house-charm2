package crm

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type CustomerPatchTest struct {
	database.Base
	OrganizationID uuid.UUID  `json:"organization_id" gorm:"type:uuid;not null;index"`
	CustomerID     uuid.UUID  `json:"customer_id" gorm:"type:uuid;not null;index"`
	TestType       string     `json:"test_type" gorm:"not null;default:colour"`
	PerformedAt    time.Time  `json:"performed_at" gorm:"not null;default:now()"`
	Result         string     `json:"result" gorm:"not null;default:pending"`
	ExpiresAt      *time.Time `json:"expires_at"`
	Notes          string     `json:"notes"`
}

func (CustomerPatchTest) TableName() string { return "customer_patch_tests" }
func (CustomerPatchTest) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*CustomerPatchTest)(nil)

type ClientConsultation struct {
	database.Base
	OrganizationID       uuid.UUID  `json:"organization_id" gorm:"type:uuid;not null;index"`
	CustomerID           uuid.UUID  `json:"customer_id" gorm:"type:uuid;not null;index"`
	StaffID              *uuid.UUID `json:"staff_id" gorm:"type:uuid"`
	BookingID            *uuid.UUID `json:"booking_id" gorm:"type:uuid"`
	ServiceName          string     `json:"service_name"`
	TreatmentSummary     string     `json:"treatment_summary"`
	SkinNotes            string     `json:"skin_notes"`
	ProductUsed          string     `json:"product_used"`
	NextAppointmentNotes string     `json:"next_appointment_notes"`
}

func (ClientConsultation) TableName() string { return "client_consultations" }
func (ClientConsultation) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*ClientConsultation)(nil)

type CreatePatchTestDTO struct {
	TestType    string     `json:"test_type"`
	PerformedAt *time.Time `json:"performed_at"`
	Result      string     `json:"result"`
	ExpiresAt   *time.Time `json:"expires_at"`
	Notes       string     `json:"notes"`
}

type CreateConsultationDTO struct {
	StaffID              *uuid.UUID `json:"staff_id"`
	BookingID            *uuid.UUID `json:"booking_id"`
	ServiceName          string     `json:"service_name"`
	TreatmentSummary     string     `json:"treatment_summary"`
	SkinNotes            string     `json:"skin_notes"`
	ProductUsed          string     `json:"product_used"`
	NextAppointmentNotes string     `json:"next_appointment_notes"`
}
