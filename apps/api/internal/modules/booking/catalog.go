package booking

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	servicesmod "github.com/haus-of-wellness/api/internal/modules/services"
	staffmod "github.com/haus-of-wellness/api/internal/modules/staff"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type CatalogResponse struct {
	Branches []tenancymod.Branch   `json:"branches"`
	Services []servicesmod.Service `json:"services"`
	Staff    []staffmod.Staff      `json:"staff"`
}

type StaffAvailabilityQuery struct {
	BookingDate     string
	StartTime       string
	DurationMinutes int
	BranchID        *uuid.UUID
	StaffIDs        []uuid.UUID
}

type PortalBookingDTO struct {
	BranchID    *uuid.UUID  `json:"branchId"`
	StaffID     uuid.UUID   `json:"staffId"`
	ServiceIDs  []uuid.UUID `json:"serviceIds"`
	BookingDate string      `json:"bookingDate"`
	StartTime   string      `json:"startTime"`
	FullName    string      `json:"fullName"`
	Phone       string      `json:"phone"`
	Notes       string      `json:"notes"`
}

func (s *Service) Catalog(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) (*CatalogResponse, error) {
	return s.repo.LoadCatalog(ctx, orgID, branchID)
}

func (s *Service) StaffAvailability(ctx context.Context, orgID uuid.UUID, q StaffAvailabilityQuery) (map[string]bool, error) {
	if q.BookingDate == "" || q.StartTime == "" {
		return nil, httpx.ErrConflict
	}
	date, err := time.Parse("2006-01-02", q.BookingDate)
	if err != nil {
		return nil, httpx.ErrConflict
	}
	duration := q.DurationMinutes
	if duration <= 0 {
		duration = 30
	}
	endTime, err := addMinutesToTime(q.StartTime, duration)
	if err != nil {
		return nil, httpx.ErrConflict
	}

	staffIDs := q.StaffIDs
	if len(staffIDs) == 0 {
		catalog, err := s.repo.LoadCatalog(ctx, orgID, q.BranchID)
		if err != nil {
			return nil, err
		}
		for _, member := range catalog.Staff {
			staffIDs = append(staffIDs, member.ID)
		}
	}

	startTime := normalizeTime(q.StartTime)
	result := make(map[string]bool, len(staffIDs))
	for _, staffID := range staffIDs {
		scheduled, err := s.repo.ScheduleAllows(ctx, orgID, staffID, date, startTime, endTime)
		if err != nil {
			return nil, err
		}
		if !scheduled {
			result[staffID.String()] = false
			continue
		}
		conflicts, err := s.repo.StaffConflicts(ctx, orgID, staffID, date, startTime, endTime, nil)
		if err != nil {
			return nil, err
		}
		result[staffID.String()] = conflicts == 0
	}
	return result, nil
}

func (s *Service) CreatePortalBooking(ctx context.Context, orgID uuid.UUID, dto PortalBookingDTO) (*Booking, error) {
	if dto.StaffID == uuid.Nil || len(dto.ServiceIDs) == 0 || dto.BookingDate == "" || dto.StartTime == "" || dto.Phone == "" || dto.FullName == "" {
		return nil, httpx.ErrConflict
	}

	date, err := time.Parse("2006-01-02", dto.BookingDate)
	if err != nil {
		return nil, httpx.ErrConflict
	}

	services, totalDuration, _, err := s.repo.ResolveServices(ctx, orgID, dto.ServiceIDs)
	if err != nil {
		return nil, err
	}
	if len(services) == 0 {
		return nil, httpx.ErrConflict
	}

	startTime := normalizeTime(dto.StartTime)
	endTime, err := addMinutesToTime(startTime, totalDuration)
	if err != nil {
		return nil, httpx.ErrConflict
	}

	scheduled, err := s.repo.ScheduleAllows(ctx, orgID, dto.StaffID, date, startTime, endTime)
	if err != nil {
		return nil, err
	}
	if !scheduled {
		return nil, httpx.ErrConflict
	}

	conflicts, err := s.repo.StaffConflicts(ctx, orgID, dto.StaffID, date, startTime, endTime, nil)
	if err != nil {
		return nil, err
	}
	if conflicts > 0 {
		return nil, httpx.ErrConflict
	}

	var customerID uuid.UUID
	if s.crm != nil {
		customer, err := s.crm.FindOrCreateByPhone(ctx, orgID, dto.FullName, dto.Phone)
		if err != nil {
			return nil, err
		}
		customerID = customer.ID
	} else {
		customerID = uuid.NewSHA1(uuid.NameSpaceURL, []byte("portal:"+orgID.String()+":"+dto.Phone))
	}

	staffID := dto.StaffID
	booking := &Booking{
		OrganizationID: orgID,
		CustomerID:     customerID,
		StaffID:        &staffID,
		BranchID:       dto.BranchID,
		BookingDate:    date,
		StartTime:      startTime,
		EndTime:        endTime,
		Status:         "scheduled",
		Notes:          dto.Notes,
	}

	lines := make([]BookingService, 0, len(services))
	for _, svc := range services {
		lines = append(lines, BookingService{
			ServiceName:     svc.Name,
			DurationMinutes: svc.DurationMinutes,
			PriceKES:        svc.PriceKES,
		})
	}

	if err := s.repo.CreateWithServices(ctx, booking, lines); err != nil {
		return nil, err
	}

	if s.publisher != nil {
		_ = s.publisher.PublishQueue(ctx, orgID, "booking.created", map[string]any{
			"booking_id":   booking.ID,
			"customer_id":  booking.CustomerID,
			"status":       booking.Status,
			"booking_date": booking.BookingDate.Format("2006-01-02"),
			"start_time":   booking.StartTime,
		})
	}
	return booking, nil
}

func addMinutesToTime(start string, minutes int) (string, error) {
	layouts := []string{"15:04", "15:04:05"}
	var parsed time.Time
	var err error
	for _, layout := range layouts {
		parsed, err = time.Parse(layout, start)
		if err == nil {
			break
		}
	}
	if err != nil {
		return "", err
	}
	return parsed.Add(time.Duration(minutes) * time.Minute).Format("15:04"), nil
}

func (r *Repository) LoadCatalog(ctx context.Context, orgID uuid.UUID, branchID *uuid.UUID) (*CatalogResponse, error) {
	var branches []tenancymod.Branch
	if err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Where("is_active = true").Order("name ASC").Find(&branches).Error; err != nil {
		return nil, err
	}

	svcQuery := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Where("is_active = true")
	if branchID != nil {
		svcQuery = svcQuery.Where("branch_id IS NULL OR branch_id = ?", *branchID)
	}
	var services []servicesmod.Service
	if err := svcQuery.Order("name ASC").Find(&services).Error; err != nil {
		return nil, err
	}

	staffQuery := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Where("is_active = true")
	if branchID != nil {
		staffQuery = staffQuery.Where("branch_id IS NULL OR branch_id = ?", *branchID)
	}
	var staff []staffmod.Staff
	if err := staffQuery.Order("display_name ASC").Find(&staff).Error; err != nil {
		return nil, err
	}

	return &CatalogResponse{Branches: branches, Services: services, Staff: staff}, nil
}

func (r *Repository) ResolveServices(ctx context.Context, orgID uuid.UUID, ids []uuid.UUID) ([]servicesmod.Service, int, int, error) {
	var services []servicesmod.Service
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Where("id IN ? AND is_active = true", ids).
		Find(&services).Error
	if err != nil {
		return nil, 0, 0, err
	}
	if len(services) != len(ids) {
		return nil, 0, 0, fmt.Errorf("invalid service selection")
	}

	byID := make(map[uuid.UUID]servicesmod.Service, len(services))
	for _, svc := range services {
		byID[svc.ID] = svc
	}
	ordered := make([]servicesmod.Service, 0, len(ids))
	totalDuration := 0
	totalPrice := 0
	for _, id := range ids {
		svc, ok := byID[id]
		if !ok {
			return nil, 0, 0, fmt.Errorf("invalid service selection")
		}
		ordered = append(ordered, svc)
		totalDuration += svc.DurationMinutes
		totalPrice += svc.PriceKES
	}
	return ordered, totalDuration, totalPrice, nil
}

func (r *Repository) CreateWithServices(ctx context.Context, booking *Booking, lines []BookingService) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(booking).Error; err != nil {
			return err
		}
		for i := range lines {
			lines[i].BookingID = booking.ID
			lines[i].OrganizationID = booking.OrganizationID
		}
		if len(lines) > 0 {
			if err := tx.Create(&lines).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

type CRMRepository interface {
	FindOrCreateByPhone(ctx context.Context, orgID uuid.UUID, fullName, phone string) (*crmmod.Customer, error)
}
