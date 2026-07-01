package staff

import (
	"github.com/google/uuid"
	"github.com/lib/pq"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Staff struct {
	database.Base
	OrganizationID  uuid.UUID      `gorm:"type:uuid;not null;index"`
	UserID          *uuid.UUID     `gorm:"type:uuid"`
	BranchID        *uuid.UUID     `gorm:"type:uuid"`
	DisplayName     string         `gorm:"not null"`
	Title           string
	Email           string
	Phone           string
	Role            string         `gorm:"type:app_role"`
	Bio             string
	Specialties     pq.StringArray `gorm:"type:text[]"`
	CommissionRate  float64        `gorm:"type:numeric(5,2);not null;default:0"`
	IsActive        bool           `gorm:"not null;default:true"`
}

func (Staff) TableName() string { return "staff" }
func (Staff) IsTenantScoped()   {}

type StaffSchedule struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID        uuid.UUID  `gorm:"type:uuid;not null;index"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	ScheduleDate   string     `gorm:"type:date;not null"`
	StartTime      string     `gorm:"type:time;not null;default:'08:00'"`
	EndTime        string     `gorm:"type:time;not null;default:'20:00'"`
	IsDayOff       bool       `gorm:"not null;default:false"`
	Notes          string
}

func (StaffSchedule) TableName() string { return "staff_schedules" }
func (StaffSchedule) IsTenantScoped()   {}

var (
	_ tenancy.OrgScoped = (*Staff)(nil)
	_ tenancy.OrgScoped = (*StaffSchedule)(nil)
)
