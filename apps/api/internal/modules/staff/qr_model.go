package staff

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type QRScan struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index"`
	StaffID        uuid.UUID  `gorm:"type:uuid;not null"`
	BranchID       *uuid.UUID `gorm:"type:uuid"`
	ScanType       string     `gorm:"not null"`
	ScannedAt      time.Time  `gorm:"not null"`
	GeoLat         *float64
	GeoLng         *float64
	Verified       bool       `gorm:"not null;default:false"`
}

func (QRScan) TableName() string { return "qr_scans" }
func (QRScan) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*QRScan)(nil)
