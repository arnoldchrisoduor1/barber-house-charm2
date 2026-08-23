package main

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"

	bookingmod "github.com/haus-of-wellness/api/internal/modules/booking"
	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	marketingmod "github.com/haus-of-wellness/api/internal/modules/marketing"
	retailmod "github.com/haus-of-wellness/api/internal/modules/retail"
	servicesmod "github.com/haus-of-wellness/api/internal/modules/services"
	settingsmod "github.com/haus-of-wellness/api/internal/modules/settings"
	staffmod "github.com/haus-of-wellness/api/internal/modules/staff"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

type modeDemoOrgConfig struct {
	Slug, Name, BusinessType, BranchName, Plan string
	Specialty                                   *string
}

type serviceSeedRow struct {
	name, category  string
	duration, price int
	prep, buffer    int
}

type staffSeedRow struct {
	name, email, phone, title string
	specialties               []string
	commission                float64
}

func ensureModeDemoOrg(ctx context.Context, db *gorm.DB, ceoUserID uuid.UUID, cfg modeDemoOrgConfig) (*tenancymod.Organization, tenancymod.Branch, error) {
	var org tenancymod.Organization
	err := db.WithContext(ctx).Where("slug = ?", cfg.Slug).First(&org).Error
	if err == gorm.ErrRecordNotFound {
		org = tenancymod.Organization{
			Name:         cfg.Name,
			Slug:         cfg.Slug,
			BusinessType: cfg.BusinessType,
			Specialty:    cfg.Specialty,
		}
		if err := db.WithContext(ctx).Create(&org).Error; err != nil {
			return nil, tenancymod.Branch{}, err
		}
	} else if err != nil {
		return nil, tenancymod.Branch{}, err
	} else if cfg.Specialty != nil {
		need := org.Specialty == nil || *org.Specialty != *cfg.Specialty
		if need {
			if err := db.WithContext(ctx).Model(&org).Update("specialty", *cfg.Specialty).Error; err != nil {
				return nil, tenancymod.Branch{}, err
			}
			org.Specialty = cfg.Specialty
		}
	}

	if err := ensureOrgLinks(ctx, db, org.ID, ceoUserID); err != nil {
		return nil, tenancymod.Branch{}, err
	}

	var sub tenancymod.Subscription
	if err := db.WithContext(ctx).Where("organization_id = ?", org.ID).First(&sub).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return nil, tenancymod.Branch{}, err
		}
		trialEnds := time.Now().Add(7 * 24 * time.Hour)
		if err := db.WithContext(ctx).Create(&tenancymod.Subscription{
			OrganizationID: org.ID,
			Plan:           cfg.Plan,
			Status:         "active",
			TrialEndsAt:    &trialEnds,
		}).Error; err != nil {
			return nil, tenancymod.Branch{}, err
		}
	} else if sub.Plan != cfg.Plan {
		if err := db.WithContext(ctx).Model(&sub).Updates(map[string]any{"plan": cfg.Plan, "status": "active"}).Error; err != nil {
			return nil, tenancymod.Branch{}, err
		}
	}

	var branch tenancymod.Branch
	if err := db.WithContext(ctx).Where("organization_id = ?", org.ID).First(&branch).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return nil, tenancymod.Branch{}, err
		}
		branch = tenancymod.Branch{
			OrganizationID: org.ID,
			Name:           cfg.BranchName,
			Address:        "Westlands, Nairobi",
			Phone:          "+254700000010",
		}
		if err := db.WithContext(ctx).Create(&branch).Error; err != nil {
			return nil, tenancymod.Branch{}, err
		}
	}
	return &org, branch, nil
}

func seedStaffIfEmpty(ctx context.Context, db *gorm.DB, orgID, branchID uuid.UUID, seeds []staffSeedRow) error {
	var count int64
	db.WithContext(ctx).Model(&staffmod.Staff{}).Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}
	for _, s := range seeds {
		bid := branchID
		row := staffmod.Staff{
			OrganizationID: orgID,
			BranchID:       &bid,
			DisplayName:    s.name,
			Title:          s.title,
			Email:          s.email,
			Phone:          s.phone,
			Role:           "senior_barber",
			Specialties:    pq.StringArray(s.specialties),
			IsActive:       true,
			CommissionRate: s.commission,
		}
		if err := db.WithContext(ctx).Create(&row).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedServicesIfEmpty(ctx context.Context, db *gorm.DB, orgID uuid.UUID, seeds []serviceSeedRow) error {
	var count int64
	db.WithContext(ctx).Model(&servicesmod.Service{}).Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}
	for _, s := range seeds {
		row := servicesmod.Service{
			OrganizationID:  orgID,
			Name:            s.name,
			Category:        s.category,
			PriceKES:        s.price,
			DurationMinutes: s.duration,
			PrepMinutes:     s.prep,
			BufferMinutes:   s.buffer,
			IsActive:        true,
		}
		if err := db.WithContext(ctx).Create(&row).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedCustomers(ctx context.Context, db *gorm.DB, orgID uuid.UUID, clients []crmmod.Customer) error {
	for _, c := range clients {
		var existing crmmod.Customer
		err := db.WithContext(ctx).Where("organization_id = ? AND phone = ?", orgID, c.Phone).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			if err := db.WithContext(ctx).Create(&c).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func seedConsentFormsIfEmpty(ctx context.Context, db *gorm.DB, orgID uuid.UUID, forms []settingsmod.ConsentForm) error {
	var count int64
	db.WithContext(ctx).Model(&settingsmod.ConsentForm{}).Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}
	for i := range forms {
		if err := db.WithContext(ctx).Create(&forms[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedLoyaltyIfEmpty(ctx context.Context, db *gorm.DB, orgID uuid.UUID, rewards []marketingmod.LoyaltyReward) error {
	var count int64
	db.WithContext(ctx).Model(&marketingmod.LoyaltyReward{}).Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}
	for i := range rewards {
		if err := db.WithContext(ctx).Create(&rewards[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedPackagesIfEmpty(ctx context.Context, db *gorm.DB, orgID uuid.UUID, pkgs []marketingmod.ServicePackage) error {
	var count int64
	db.WithContext(ctx).Model(&marketingmod.ServicePackage{}).Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}
	for i := range pkgs {
		if err := db.WithContext(ctx).Create(&pkgs[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedGalleryIfEmpty(ctx context.Context, db *gorm.DB, orgID uuid.UUID, items []settingsmod.GalleryItem) error {
	var count int64
	db.WithContext(ctx).Model(&settingsmod.GalleryItem{}).Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}
	for i := range items {
		if err := db.WithContext(ctx).Create(&items[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedRetailIfEmpty(ctx context.Context, db *gorm.DB, orgID uuid.UUID, products []retailmod.Product) error {
	var count int64
	db.WithContext(ctx).Model(&retailmod.Product{}).Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}
	for i := range products {
		if err := db.WithContext(ctx).Create(&products[i]).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedBookingIfEmpty(ctx context.Context, db *gorm.DB, orgID, branchID uuid.UUID, notes string) error {
	var bookingCount int64
	db.WithContext(ctx).Model(&bookingmod.Booking{}).Where("organization_id = ?", orgID).Count(&bookingCount)
	if bookingCount > 0 {
		return nil
	}
	var customer crmmod.Customer
	if err := db.WithContext(ctx).Where("organization_id = ?", orgID).First(&customer).Error; err != nil {
		return err
	}
	var staff staffmod.Staff
	if err := db.WithContext(ctx).Where("organization_id = ?", orgID).First(&staff).Error; err != nil {
		return err
	}
	staffID := staff.ID
	bid := branchID
	booking := bookingmod.Booking{
		OrganizationID: orgID,
		CustomerID:     customer.ID,
		StaffID:        &staffID,
		BranchID:       &bid,
		BookingDate:    time.Now(),
		StartTime:      "10:00",
		EndTime:        "11:00",
		Status:         "scheduled",
		Notes:          notes,
	}
	return db.WithContext(ctx).Create(&booking).Error
}

func seedCoverageZonesIfEmpty(ctx context.Context, db *gorm.DB, orgID uuid.UUID) error {
	var count int64
	db.WithContext(ctx).Table("coverage_zones").Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}
	return db.WithContext(ctx).Exec(`
		INSERT INTO coverage_zones (organization_id, name, city, radius_km, surcharge_kes, is_active)
		VALUES
		  (?, 'Westlands Hub', 'Nairobi', 8, 500, true),
		  (?, 'Karen & Langata', 'Nairobi', 12, 800, true),
		  (?, 'Kiambu Road', 'Kiambu', 15, 1000, true)
	`, orgID, orgID, orgID).Error
}

func seedFieldJobsIfEmpty(ctx context.Context, db *gorm.DB, orgID uuid.UUID) error {
	var count int64
	if err := db.WithContext(ctx).Raw(`SELECT count(*) FROM information_schema.tables WHERE table_name = 'field_jobs'`).Scan(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return nil
	}
	count = 0
	db.WithContext(ctx).Table("field_jobs").Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}
	var staffID uuid.UUID
	if err := db.WithContext(ctx).Table("staff").Select("id").Where("organization_id = ?", orgID).Limit(1).Scan(&staffID).Error; err != nil || staffID == uuid.Nil {
		return nil
	}
	var zoneID *uuid.UUID
	var z uuid.UUID
	if err := db.WithContext(ctx).Table("coverage_zones").Select("id").Where("organization_id = ?", orgID).Limit(1).Scan(&z).Error; err == nil && z != uuid.Nil {
		zoneID = &z
	}
	var bookingID *uuid.UUID
	var b uuid.UUID
	if err := db.WithContext(ctx).Table("bookings").Select("id").Where("organization_id = ?", orgID).Limit(1).Scan(&b).Error; err == nil && b != uuid.Nil {
		bookingID = &b
	}
	return db.WithContext(ctx).Exec(`
		INSERT INTO field_jobs (organization_id, booking_id, staff_id, coverage_zone_id, status, visit_address, notes, scheduled_at)
		VALUES (?, ?, ?, ?, 'assigned', '12 Ring Road, Westlands', 'Seeded field job', NOW() + interval '2 hours')
	`, orgID, bookingID, staffID, zoneID).Error
}
