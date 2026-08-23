package clinical

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type PatientIntake struct {
	database.Base
	OrganizationID        uuid.UUID `gorm:"type:uuid;not null;index" json:"organization_id"`
	CustomerID            uuid.UUID `gorm:"type:uuid;not null;index" json:"customer_id"`
	MedicalHistory        string    `gorm:"not null;default:''" json:"medical_history"`
	Allergies             string    `gorm:"not null;default:''" json:"allergies"`
	Medications           string    `gorm:"not null;default:''" json:"medications"`
	EmergencyContactName  string    `gorm:"not null;default:''" json:"emergency_contact_name"`
	EmergencyContactPhone string    `gorm:"not null;default:''" json:"emergency_contact_phone"`
	ConsentGiven          bool      `gorm:"not null;default:false" json:"consent_given"`
	Notes                 string    `gorm:"not null;default:''" json:"notes"`
}

func (PatientIntake) TableName() string { return "patient_intake" }
func (PatientIntake) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*PatientIntake)(nil)

type AftercareInstruction struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index" json:"organization_id"`
	Title          string     `gorm:"not null" json:"title"`
	Body           string     `gorm:"not null;default:''" json:"body"`
	ProcedureName  string     `gorm:"not null;default:''" json:"procedure_name"`
	BookingID      *uuid.UUID `gorm:"type:uuid" json:"booking_id,omitempty"`
	FollowUpAt     *time.Time `gorm:"type:date" json:"follow_up_at,omitempty"`
	IsTemplate     bool       `gorm:"not null;default:true" json:"is_template"`
}

func (AftercareInstruction) TableName() string { return "aftercare_instructions" }
func (AftercareInstruction) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*AftercareInstruction)(nil)
