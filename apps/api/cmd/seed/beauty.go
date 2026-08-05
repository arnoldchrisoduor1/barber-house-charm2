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
	servicesmod "github.com/haus-of-wellness/api/internal/modules/services"
	settingsmod "github.com/haus-of-wellness/api/internal/modules/settings"
	staffmod "github.com/haus-of-wellness/api/internal/modules/staff"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

const (
	beautyOrgSlug = "beauty-demo-salon"
	beautyOrgName = "Haus of Beauty Demo"
)

func ensureBeautyDemoOrg(ctx context.Context, db *gorm.DB, ceoUserID uuid.UUID) error {
	var org tenancymod.Organization
	err := db.WithContext(ctx).Where("slug = ?", beautyOrgSlug).First(&org).Error
	if err == gorm.ErrRecordNotFound {
		org = tenancymod.Organization{
			Name:         beautyOrgName,
			Slug:         beautyOrgSlug,
			BusinessType: "beauty",
		}
		if err := db.WithContext(ctx).Create(&org).Error; err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	if err := ensureOrgLinks(ctx, db, org.ID, ceoUserID); err != nil {
		return err
	}

	var sub tenancymod.Subscription
	if err := db.WithContext(ctx).Where("organization_id = ?", org.ID).First(&sub).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		trialEnds := time.Now().Add(7 * 24 * time.Hour)
		if err := db.WithContext(ctx).Create(&tenancymod.Subscription{
			OrganizationID: org.ID,
			Plan:           "professional",
			Status:         "active",
			TrialEndsAt:    &trialEnds,
		}).Error; err != nil {
			return err
		}
	} else if sub.Plan != "professional" {
		if err := db.WithContext(ctx).Model(&sub).Updates(map[string]any{
			"plan":   "professional",
			"status": "active",
		}).Error; err != nil {
			return err
		}
	}

	var branch tenancymod.Branch
	if err := db.WithContext(ctx).Where("organization_id = ?", org.ID).First(&branch).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		if err := db.WithContext(ctx).Create(&tenancymod.Branch{
			OrganizationID: org.ID,
			Name:           "Beauty Main",
			Address:        "Westlands, Nairobi",
			Phone:          "+254700000001",
		}).Error; err != nil {
			return err
		}
		if err := db.WithContext(ctx).Where("organization_id = ?", org.ID).First(&branch).Error; err != nil {
			return err
		}
	}

	return ensureBeautySampleData(ctx, db, org.ID, branch.ID)
}

func ensureBeautySampleData(ctx context.Context, db *gorm.DB, orgID, branchID uuid.UUID) error {
	type beautyStaffSeed struct {
		name, email, phone, role string
		specialties              []string
	}
	staffSeeds := []beautyStaffSeed{
		{"Faith Omondi", "faith@beauty-demo.local", "+254722100001", "senior_barber", []string{"braids", "weaves"}},
		{"Grace Mwangi", "grace@beauty-demo.local", "+254722100002", "senior_barber", []string{"makeup", "lashes"}},
		{"Mary Njeri", "mary@beauty-demo.local", "+254722100003", "senior_barber", []string{"facials", "skincare"}},
		{"Joyce Kariuki", "joyce@beauty-demo.local", "+254722100004", "senior_barber", []string{"colour", "hair_treatment"}},
	}

	var staffCount int64
	db.WithContext(ctx).Model(&staffmod.Staff{}).Where("organization_id = ?", orgID).Count(&staffCount)
	if staffCount == 0 {
		for _, s := range staffSeeds {
			bid := branchID
			row := staffmod.Staff{
				OrganizationID: orgID,
				BranchID:       &bid,
				DisplayName:    s.name,
				Title:          "Senior Stylist",
				Email:          s.email,
				Phone:          s.phone,
				Role:           s.role,
				Specialties:    pq.StringArray(s.specialties),
				IsActive:       true,
				CommissionRate: 12,
			}
			if err := db.WithContext(ctx).Create(&row).Error; err != nil {
				return err
			}
		}
	}

	type beautyServiceSeed struct {
		name, category string
		duration       int
		price          int
		prep, buffer   int
		patchTest      bool
	}
	serviceSeeds := []beautyServiceSeed{
		{"Box Braids", "braids", 120, 4500, 0, 10, false},
		{"Knotless Braids", "braids", 150, 5500, 0, 10, false},
		{"Gel Manicure", "nails", 60, 1800, 0, 5, false},
		{"Facial Deep Clean", "facial", 60, 3500, 5, 10, false},
		{"Full Makeup", "makeup", 90, 5000, 0, 5, false},
		{"Lash Extensions", "lashes", 90, 4000, 0, 5, false},
		{"Eyebrow Threading", "waxing", 20, 800, 0, 5, false},
		{"Silk Press", "hair_treatment", 90, 3500, 15, 10, false},
		{"Hair Colour", "colour", 120, 6000, 15, 10, true},
		{"Wax Full Legs", "waxing", 45, 2500, 0, 5, false},
		{"Scalp Treatment", "treatment", 60, 2800, 0, 5, false},
		{"Bridal Package", "makeup", 240, 15000, 0, 5, false},
	}

	var serviceCount int64
	db.WithContext(ctx).Model(&servicesmod.Service{}).Where("organization_id = ?", orgID).Count(&serviceCount)
	if serviceCount == 0 {
		for _, s := range serviceSeeds {
			row := servicesmod.Service{
				OrganizationID:    orgID,
				Name:              s.name,
				Category:          s.category,
				PriceKES:          s.price,
				DurationMinutes:   s.duration,
				PrepMinutes:       s.prep,
				BufferMinutes:     s.buffer,
				RequiresPatchTest: s.patchTest,
				IsActive:          true,
			}
			if err := db.WithContext(ctx).Create(&row).Error; err != nil {
				return err
			}
		}
	}

	clients := []crmmod.Customer{
		{
			OrganizationID: orgID, FullName: "Amina Wanjiku", Phone: "+254711200001",
			Email: "amina@example.com", LoyaltyTier: "gold", LoyaltyPoints: 80, TotalVisits: 5,
		},
		{
			OrganizationID: orgID, FullName: "Zara Okello", Phone: "+254711200002",
			Email: "zara@example.com", HasAllergies: true, AllergyNotes: "Allergic to ammonia/PPD",
			LoyaltyTier: "silver",
		},
		{OrganizationID: orgID, FullName: "Linda Chebet", Phone: "+254711200003", Email: "linda@example.com"},
		{OrganizationID: orgID, FullName: "Naomi Akinyi", Phone: "+254711200004", Email: "naomi@example.com"},
		{OrganizationID: orgID, FullName: "Patricia Muthoni", Phone: "+254711200005", Email: "patricia@example.com"},
	}
	for _, c := range clients {
		var existing crmmod.Customer
		err := db.WithContext(ctx).Where("organization_id = ? AND phone = ?", orgID, c.Phone).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			if err := db.WithContext(ctx).Create(&c).Error; err != nil {
				return err
			}
		}
	}

	var consentCount int64
	db.WithContext(ctx).Model(&settingsmod.ConsentForm{}).Where("organization_id = ?", orgID).Count(&consentCount)
	if consentCount == 0 {
		forms := []settingsmod.ConsentForm{
			{OrganizationID: orgID, Title: "Chemical Treatment Consent", Content: "I consent to chemical treatment and understand patch test requirements.", FormType: "chemical"},
			{OrganizationID: orgID, Title: "Waxing/Facial Consent", Content: "I confirm skin condition disclosure for waxing and facial services.", FormType: "waxing"},
			{OrganizationID: orgID, Title: "Allergy & Patch Test Declaration", Content: "I declare known allergies and patch test status.", FormType: "allergy"},
		}
		for i := range forms {
			if err := db.WithContext(ctx).Create(&forms[i]).Error; err != nil {
				return err
			}
		}
	}

	var rewardCount int64
	db.WithContext(ctx).Model(&marketingmod.LoyaltyReward{}).Where("organization_id = ?", orgID).Count(&rewardCount)
	if rewardCount == 0 {
		rewards := []marketingmod.LoyaltyReward{
			{OrganizationID: orgID, Name: "Free Eyebrow Threading", Description: "50 points reward", PointsRequired: 50, RewardType: "service", IsActive: true},
			{OrganizationID: orgID, Name: "15% off Braids", Description: "100 points reward", PointsRequired: 100, RewardType: "discount", RewardValue: 15, IsActive: true},
		}
		for i := range rewards {
			if err := db.WithContext(ctx).Create(&rewards[i]).Error; err != nil {
				return err
			}
		}
	}

	var pkgCount int64
	db.WithContext(ctx).Model(&marketingmod.ServicePackage{}).Where("organization_id = ?", orgID).Count(&pkgCount)
	if pkgCount == 0 {
		pkgs := []marketingmod.ServicePackage{
			{OrganizationID: orgID, Name: "Facial Series ×6", Description: "Six facials over 90 days", TotalSessions: 6, ValidDays: 90, PriceKES: 18000, IsActive: true},
			{OrganizationID: orgID, Name: "Braids Loyalty Pack ×3", Description: "Three braid sessions over 90 days", TotalSessions: 3, ValidDays: 90, PriceKES: 12000, IsActive: true},
		}
		for i := range pkgs {
			if err := db.WithContext(ctx).Create(&pkgs[i]).Error; err != nil {
				return err
			}
		}
	}

	var bookingCount int64
	db.WithContext(ctx).Model(&bookingmod.Booking{}).Where("organization_id = ?", orgID).Count(&bookingCount)
	if bookingCount == 0 {
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
		today := time.Now()
		booking := bookingmod.Booking{
			OrganizationID: orgID,
			CustomerID:     customer.ID,
			StaffID:        &staffID,
			BranchID:       &bid,
			BookingDate:    today,
			StartTime:      "11:00",
			EndTime:        "12:00",
			Status:         "scheduled",
			Notes:          "Seeded beauty appointment",
		}
		if err := db.WithContext(ctx).Create(&booking).Error; err != nil {
			return err
		}
	}

	return nil
}
