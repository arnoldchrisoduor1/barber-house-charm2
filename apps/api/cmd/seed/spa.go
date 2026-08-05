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
	resourcesmod "github.com/haus-of-wellness/api/internal/modules/resources"
	servicesmod "github.com/haus-of-wellness/api/internal/modules/services"
	settingsmod "github.com/haus-of-wellness/api/internal/modules/settings"
	staffmod "github.com/haus-of-wellness/api/internal/modules/staff"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

const (
	spaOrgSlug = "spa-demo-wellness"
	spaOrgName = "Haus of Spa Demo"
)

func ensureSpaDemoOrg(ctx context.Context, db *gorm.DB, ceoUserID uuid.UUID) error {
	var org tenancymod.Organization
	err := db.WithContext(ctx).Where("slug = ?", spaOrgSlug).First(&org).Error
	if err == gorm.ErrRecordNotFound {
		org = tenancymod.Organization{
			Name:         spaOrgName,
			Slug:         spaOrgSlug,
			BusinessType: "spa",
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
			Name:           "Spa Main",
			Address:        "Karen, Nairobi",
			Phone:          "+254700000002",
		}).Error; err != nil {
			return err
		}
		if err := db.WithContext(ctx).Where("organization_id = ?", org.ID).First(&branch).Error; err != nil {
			return err
		}
	}

	return ensureSpaSampleData(ctx, db, org.ID, branch.ID)
}

func ensureSpaSampleData(ctx context.Context, db *gorm.DB, orgID, branchID uuid.UUID) error {
	type spaStaffSeed struct {
		name, email, phone, role string
		specialties              []string
	}
	staffSeeds := []spaStaffSeed{
		{"Sarah Kamau", "sarah@spa-demo.local", "+254722200001", "senior_barber", []string{"swedish", "deep_tissue", "aromatherapy"}},
		{"James Ochieng", "james@spa-demo.local", "+254722200002", "senior_barber", []string{"hot_stone", "body_treatment", "reflexology"}},
		{"Grace Wanjiku", "grace@spa-demo.local", "+254722200003", "senior_barber", []string{"prenatal", "meditation", "hydrotherapy"}},
		{"Peter Mutua", "peter@spa-demo.local", "+254722200004", "junior_barber", []string{"steam", "sauna", "couples_package"}},
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
				Title:          "Senior Therapist",
				Email:          s.email,
				Phone:          s.phone,
				Role:           s.role,
				Specialties:    pq.StringArray(s.specialties),
				IsActive:       true,
				CommissionRate: 10,
			}
			if err := db.WithContext(ctx).Create(&row).Error; err != nil {
				return err
			}
		}
	}

	type spaServiceSeed struct {
		name, category string
		duration       int
		price          int
		prep, buffer   int
	}
	serviceSeeds := []spaServiceSeed{
		{"Swedish Massage", "swedish", 60, 4500, 5, 10},
		{"Deep Tissue Massage", "deep_tissue", 60, 5000, 5, 10},
		{"Hot Stone Therapy", "hot_stone", 90, 6500, 15, 10},
		{"Aromatherapy Massage", "aromatherapy", 60, 4800, 5, 10},
		{"Body Scrub & Wrap", "body_treatment", 90, 5500, 10, 15},
		{"Couples Massage", "couples_package", 90, 12000, 15, 15},
		{"Reflexology", "reflexology", 45, 3500, 5, 10},
		{"Steam & Sauna", "steam", 30, 2000, 0, 10},
		{"Prenatal Massage", "prenatal", 60, 5200, 5, 10},
		{"Thai Massage", "massage", 90, 5800, 5, 10},
		{"Mud Wrap Detox", "detox", 75, 6000, 10, 15},
		{"Hydrotherapy Session", "hydrotherapy", 45, 4000, 0, 10},
		{"Guided Meditation", "meditation", 30, 2500, 0, 5},
		{"Half-Day Spa Retreat", "couples_package", 240, 18000, 15, 15},
	}

	var serviceCount int64
	db.WithContext(ctx).Model(&servicesmod.Service{}).Where("organization_id = ?", orgID).Count(&serviceCount)
	if serviceCount == 0 {
		for _, s := range serviceSeeds {
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
	}

	clients := []crmmod.Customer{
		{
			OrganizationID: orgID, FullName: "Emma Kariuki", Phone: "+254711300001",
			Email: "emma@example.com", LoyaltyTier: "gold", LoyaltyPoints: 60, TotalVisits: 4,
		},
		{
			OrganizationID: orgID, FullName: "David Otieno", Phone: "+254711300002",
			Email: "david@example.com", HasAllergies: true, AllergyNotes: "Sensitive to essential oils (eucalyptus, peppermint)",
			LoyaltyTier: "silver",
		},
		{OrganizationID: orgID, FullName: "Hannah Mwangi", Phone: "+254711300003", Email: "hannah@example.com"},
		{OrganizationID: orgID, FullName: "Michael Ndungu", Phone: "+254711300004", Email: "michael@example.com"},
		{OrganizationID: orgID, FullName: "Sophie Akinyi", Phone: "+254711300005", Email: "sophie@example.com"},
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
			{OrganizationID: orgID, Title: "Massage Consent", Content: "I consent to massage therapy and understand the treatment scope.", FormType: "massage"},
			{OrganizationID: orgID, Title: "Contra-indication Declaration", Content: "I declare medical conditions, injuries, and pregnancy status.", FormType: "contraindication"},
			{OrganizationID: orgID, Title: "Pregnancy Massage Consent", Content: "I confirm pregnancy stage and consent to prenatal massage.", FormType: "pregnancy"},
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
			{OrganizationID: orgID, Name: "Free Steam Session", Description: "40 points reward", PointsRequired: 40, RewardType: "service", IsActive: true},
			{OrganizationID: orgID, Name: "15% off Massage", Description: "80 points reward", PointsRequired: 80, RewardType: "discount", RewardValue: 15, IsActive: true},
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
			{OrganizationID: orgID, Name: "Wellness Monthly Pass", Description: "Four sessions per month", TotalSessions: 4, ValidDays: 30, PriceKES: 16000, IsActive: true},
			{OrganizationID: orgID, Name: "Detox Programme ×4", Description: "Four detox treatments over 60 days", TotalSessions: 4, ValidDays: 60, PriceKES: 22000, IsActive: true},
		}
		for i := range pkgs {
			if err := db.WithContext(ctx).Create(&pkgs[i]).Error; err != nil {
				return err
			}
		}
	}

	var resourceCount int64
	db.WithContext(ctx).Model(&resourcesmod.Resource{}).Where("organization_id = ?", orgID).Count(&resourceCount)
	if resourceCount == 0 {
		bid := branchID
		resources := []resourcesmod.Resource{
			{OrganizationID: orgID, BranchID: &bid, Name: "Treatment Room 1", ResourceType: "room", Capacity: 1, Status: "available"},
			{OrganizationID: orgID, BranchID: &bid, Name: "Treatment Room 2", ResourceType: "room", Capacity: 1, Status: "available"},
			{OrganizationID: orgID, BranchID: &bid, Name: "Treatment Room 3", ResourceType: "room", Capacity: 1, Status: "available"},
			{OrganizationID: orgID, BranchID: &bid, Name: "Couple Suite", ResourceType: "room", Capacity: 2, Status: "available"},
			{OrganizationID: orgID, BranchID: &bid, Name: "Sauna", ResourceType: "facility", Capacity: 4, Status: "available"},
			{OrganizationID: orgID, BranchID: &bid, Name: "Steam Room", ResourceType: "facility", Capacity: 4, Status: "available"},
			{OrganizationID: orgID, BranchID: &bid, Name: "Spa Bed A", ResourceType: "bed", Capacity: 1, Status: "available"},
			{OrganizationID: orgID, BranchID: &bid, Name: "Spa Bed B", ResourceType: "bed", Capacity: 1, Status: "available"},
		}
		for i := range resources {
			if err := db.WithContext(ctx).Create(&resources[i]).Error; err != nil {
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
		var resource resourcesmod.Resource
		if err := db.WithContext(ctx).Where("organization_id = ?", orgID).First(&resource).Error; err != nil {
			return err
		}
		staffID := staff.ID
		resourceID := resource.ID
		bid := branchID
		today := time.Now()
		booking := bookingmod.Booking{
			OrganizationID: orgID,
			CustomerID:     customer.ID,
			StaffID:        &staffID,
			ResourceID:     &resourceID,
			BranchID:       &bid,
			BookingDate:    today,
			StartTime:      "10:00",
			EndTime:        "11:00",
			Status:         "scheduled",
			Notes:          "Seeded spa session",
		}
		if err := db.WithContext(ctx).Create(&booking).Error; err != nil {
			return err
		}
	}

	return nil
}
