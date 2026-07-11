package staff

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformmod "github.com/haus-of-wellness/api/internal/modules/platform"
)

type QRService struct {
	repo        *Repository
	platformSvc *platformmod.Service
	secret      string
}

func NewQRService(repo *Repository, platformSvc *platformmod.Service, secret string) *QRService {
	return &QRService{repo: repo, platformSvc: platformSvc, secret: secret}
}

type ClockDTO struct {
	StaffID  *uuid.UUID `json:"staff_id"`
	BranchID *uuid.UUID `json:"branch_id"`
	ScanType string     `json:"scan_type"`
	GeoLat   *float64   `json:"geo_lat"`
	GeoLng   *float64   `json:"geo_lng"`
}

type MyAttendanceResponse struct {
	StaffID     string     `json:"staff_id"`
	DisplayName string     `json:"display_name"`
	Date        string     `json:"date"`
	ClockIn     *time.Time `json:"clock_in"`
	ClockOut    *time.Time `json:"clock_out"`
}

func (s *QRService) Clock(ctx context.Context, orgID, userID uuid.UUID, dto ClockDTO) (*QRScan, error) {
	staffID, staff, err := s.resolveClockStaff(ctx, orgID, userID, dto.StaffID)
	if err != nil {
		return nil, err
	}
	scanType := strings.TrimSpace(dto.ScanType)
	if scanType == "" {
		scanType = "clock_in"
	}
	if scanType != "clock_in" && scanType != "clock_out" {
		return nil, httpx.ErrConflict
	}
	row := &QRScan{
		OrganizationID: orgID,
		StaffID:        staffID,
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
	if s.platformSvc != nil {
		meta, _ := json.Marshal(map[string]string{
			"staff":    staff.DisplayName,
			"scanType": scanType,
		})
		action := "staff.clock_in"
		if scanType == "clock_out" {
			action = "staff.clock_out"
		}
		uid := userID
		eid := staffID
		_ = s.platformSvc.RecordOrgAudit(ctx, orgID, &uid, action, "attendance", &eid, meta)
	}
	return row, nil
}

func (s *QRService) resolveClockStaff(ctx context.Context, orgID, userID uuid.UUID, requested *uuid.UUID) (uuid.UUID, *Staff, error) {
	linked, err := s.repo.FindStaffByUser(ctx, orgID, userID)
	if err != nil {
		return uuid.Nil, nil, err
	}
	if requested != nil && *requested != uuid.Nil {
		if linked == nil || linked.ID != *requested {
			return uuid.Nil, nil, httpx.ErrForbidden
		}
		return linked.ID, linked, nil
	}
	if linked == nil {
		return uuid.Nil, nil, httpx.ErrConflict
	}
	return linked.ID, linked, nil
}

func (s *QRService) MyAttendance(ctx context.Context, orgID, userID uuid.UUID, date string) (*MyAttendanceResponse, error) {
	staff, err := s.repo.FindStaffByUser(ctx, orgID, userID)
	if err != nil {
		return nil, err
	}
	if staff == nil {
		return nil, httpx.ErrNotFound
	}
	d := date
	if d == "" {
		d = time.Now().Format("2006-01-02")
	}
	clockIn, clockOut, err := s.repo.StaffAttendanceDay(ctx, orgID, staff.ID, d)
	if err != nil {
		return nil, err
	}
	return &MyAttendanceResponse{
		StaffID:     staff.ID.String(),
		DisplayName: staff.DisplayName,
		Date:        d,
		ClockIn:     clockIn,
		ClockOut:    clockOut,
	}, nil
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
