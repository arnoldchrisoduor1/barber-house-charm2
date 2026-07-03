package staff

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type QRService struct {
	repo   *Repository
	secret string
}

func NewQRService(repo *Repository, secret string) *QRService {
	return &QRService{repo: repo, secret: secret}
}

type ClockDTO struct {
	StaffID  uuid.UUID  `json:"staff_id"`
	BranchID *uuid.UUID `json:"branch_id"`
	ScanType string     `json:"scan_type"`
	GeoLat   *float64   `json:"geo_lat"`
	GeoLng   *float64   `json:"geo_lng"`
}

func (s *QRService) Clock(ctx context.Context, orgID uuid.UUID, dto ClockDTO) (*QRScan, error) {
	scanType := dto.ScanType
	if scanType == "" {
		scanType = "clock_in"
	}
	row := &QRScan{
		OrganizationID: orgID,
		StaffID:        dto.StaffID,
		BranchID:       dto.BranchID,
		ScanType:       scanType,
		ScannedAt:      time.Now(),
		GeoLat:         dto.GeoLat,
		GeoLng:         dto.GeoLng,
		Verified:       true,
	}
	if err := s.repo.CreateQRScan(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *QRService) ListScans(ctx context.Context, orgID uuid.UUID, staffID *uuid.UUID, date string) ([]QRScan, error) {
	return s.repo.ListQRScans(ctx, orgID, staffID, date)
}

func (s *QRService) Attendance(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID, date string) (any, error) {
	return s.repo.AttendanceSummary(ctx, orgID, branchID, date)
}

func (s *QRService) BranchToken(orgID, branchID uuid.UUID) string {
	mac := hmac.New(sha256.New, []byte(s.secret))
	mac.Write([]byte(fmt.Sprintf("%s:%s:%d", orgID, branchID, time.Now().Unix()/86400)))
	return hex.EncodeToString(mac.Sum(nil))
}
