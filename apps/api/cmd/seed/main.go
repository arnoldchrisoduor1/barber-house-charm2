package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/config"
	"github.com/haus-of-wellness/api/internal/platform/database"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	authmod "github.com/haus-of-wellness/api/internal/modules/auth"
	bookingmod "github.com/haus-of-wellness/api/internal/modules/booking"
	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	platformmod "github.com/haus-of-wellness/api/internal/modules/platform"
	retailmod "github.com/haus-of-wellness/api/internal/modules/retail"
	servicesmod "github.com/haus-of-wellness/api/internal/modules/services"
	staffmod "github.com/haus-of-wellness/api/internal/modules/staff"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

const (
	demoEmail         = "arnoldchris262@gmail.com"
	demoPassword      = "Admin123!"
	demoOrgSlug       = "demo-salon"
	legacyDemoEmail   = "demo@haus.local"
	staffDemoEmail    = "staff.demo@e2e.test"
	staffDemoPassword = "StaffPass123!"
)

func main() {
	if os.Getenv("APP_ENV") == "production" {
		log.Fatal("seed refused in production")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := database.Connect(cfg.DatabaseURL, true)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	ctx := context.Background()

	reg, err := featuremod.LoadRegistry()
	if err != nil {
		log.Fatalf("features registry: %v", err)
	}
	featureSvc := featuremod.NewService(featuremod.NewRepository(db), reg)
	if err := featureSvc.SyncCatalog(ctx); err != nil {
		log.Fatalf("sync features: %v", err)
	}

	org, userID, err := ensureDemoOrg(ctx, db)
	if err != nil {
		log.Fatalf("demo org: %v", err)
	}

	if err := ensureSampleData(ctx, db, org.ID); err != nil {
		log.Fatalf("sample data: %v", err)
	}

	if err := ensureDemoStaffUser(ctx, db, org.ID); err != nil {
		log.Fatalf("demo staff user: %v", err)
	}

	_ = userID
	log.Printf("seed complete: %s / %s (org slug %s)", demoEmail, demoPassword, demoOrgSlug)
	log.Printf("seed staff login: %s / %s", staffDemoEmail, staffDemoPassword)
}

func ensureDemoOrg(ctx context.Context, db *gorm.DB) (*tenancymod.Organization, uuid.UUID, error) {
	email := strings.ToLower(strings.TrimSpace(demoEmail))
	hash, err := platformauth.HashPassword(demoPassword)
	if err != nil {
		return nil, uuid.Nil, err
	}

	var user authmod.User
	err = db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, uuid.Nil, err
	}
	if err == gorm.ErrRecordNotFound {
		err = db.WithContext(ctx).Where("email = ?", legacyDemoEmail).First(&user).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return nil, uuid.Nil, err
		}
	}

	var org tenancymod.Organization
	if err == gorm.ErrRecordNotFound {
		verifiedAt := time.Now()
		user = authmod.User{Email: email, PasswordHash: hash, EmailVerifiedAt: &verifiedAt}
		if err := db.WithContext(ctx).Create(&user).Error; err != nil {
			return nil, uuid.Nil, err
		}
		if err := db.WithContext(ctx).Create(&authmod.Profile{UserID: user.ID, FullName: "Demo CEO"}).Error; err != nil {
			return nil, uuid.Nil, err
		}

		org = tenancymod.Organization{
			Name:         "Demo Haus Salon",
			Slug:         demoOrgSlug,
			BusinessType: "barber",
		}
		if err := db.WithContext(ctx).Create(&org).Error; err != nil {
			return nil, uuid.Nil, err
		}

		platformRepo := platformmod.NewRepository(db)
		_ = platformRepo.AppendAudit(ctx, &platformmod.AuditLog{
			ActorUserID:  &user.ID,
			Action:       "seed.demo_created",
			ResourceType: "organization",
			ResourceID:   org.ID.String(),
		})
	} else {
		verifiedAt := time.Now()
		if err := db.WithContext(ctx).Model(&user).Updates(map[string]any{
			"email":              email,
			"password_hash":      hash,
			"email_verified_at":  verifiedAt,
		}).Error; err != nil {
			return nil, uuid.Nil, err
		}
		// Reset 2FA so E2E auth.setup can log in without MailHog race.
		_ = db.WithContext(ctx).Where("user_id = ?", user.ID).Delete(&authmod.UserTwoFactor{}).Error
		if err := db.WithContext(ctx).Where("slug = ?", demoOrgSlug).First(&org).Error; err != nil {
			return nil, uuid.Nil, err
		}
	}

	if err := ensureOrgLinks(ctx, db, org.ID, user.ID); err != nil {
		return nil, uuid.Nil, err
	}
	return &org, user.ID, nil
}

func ensureOrgLinks(ctx context.Context, db *gorm.DB, orgID, userID uuid.UUID) error {
	var member tenancymod.OrganizationMember
	if err := db.WithContext(ctx).
		Where("organization_id = ? AND user_id = ?", orgID, userID).
		First(&member).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		if err := db.WithContext(ctx).Create(&tenancymod.OrganizationMember{
			OrganizationID: orgID,
			UserID:         userID,
		}).Error; err != nil {
			return err
		}
	}

	var role tenancymod.UserRole
	if err := db.WithContext(ctx).
		Where("organization_id = ? AND user_id = ? AND role = ?", orgID, userID, "ceo").
		First(&role).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		if err := db.WithContext(ctx).Create(&tenancymod.UserRole{
			OrganizationID: orgID,
			UserID:         userID,
			Role:           "ceo",
		}).Error; err != nil {
			return err
		}
	}

	var sub tenancymod.Subscription
	if err := db.WithContext(ctx).Where("organization_id = ?", orgID).First(&sub).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		trialEnds := time.Now().Add(7 * 24 * time.Hour)
		if err := db.WithContext(ctx).Create(&tenancymod.Subscription{
			OrganizationID: orgID,
			Plan:           "enterprise",
			Status:         "active",
			TrialEndsAt:    &trialEnds,
		}).Error; err != nil {
			return err
		}
	} else if sub.Plan != "enterprise" {
		if err := db.WithContext(ctx).Model(&sub).Updates(map[string]any{
			"plan":   "enterprise",
			"status": "active",
		}).Error; err != nil {
			return err
		}
	}

	var wallet tenancymod.TenantWallet
	if err := db.WithContext(ctx).Where("organization_id = ?", orgID).First(&wallet).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		if err := db.WithContext(ctx).Create(&tenancymod.TenantWallet{OrganizationID: orgID}).Error; err != nil {
			return err
		}
	}

	var branch tenancymod.Branch
	if err := db.WithContext(ctx).Where("organization_id = ?", orgID).First(&branch).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		if err := db.WithContext(ctx).Create(&tenancymod.Branch{
			OrganizationID: orgID,
			Name:           "Main Branch",
			Address:        "Nairobi CBD",
			Phone:          "+254700000000",
		}).Error; err != nil {
			return err
		}
	}

	var platformUser platformmod.PlatformUser
	if err := db.WithContext(ctx).Where("user_id = ?", userID).First(&platformUser).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		if err := db.WithContext(ctx).Create(&platformmod.PlatformUser{
			UserID:   userID,
			Role:     "platform_admin",
			IsActive: true,
		}).Error; err != nil {
			return err
		}
	}

	return nil
}

func ensureSampleData(ctx context.Context, db *gorm.DB, orgID uuid.UUID) error {
	var branch tenancymod.Branch
	if err := db.WithContext(ctx).Where("organization_id = ?", orgID).First(&branch).Error; err != nil {
		return err
	}

	var customer crmmod.Customer
	err := db.WithContext(ctx).Where("organization_id = ? AND phone = ?", orgID, "+254711000001").First(&customer).Error
	if err != nil {
		customer = crmmod.Customer{
			OrganizationID: orgID,
			FullName:       "Jane Client",
			Phone:          "+254711000001",
			Email:          "jane@example.com",
			LoyaltyTier:    "silver",
			TotalVisits:    3,
			TotalSpent:     4500,
			LoyaltyPoints:  120,
		}
		if err := db.WithContext(ctx).Create(&customer).Error; err != nil {
			return err
		}
	}
	_ = db.WithContext(ctx).Exec(
		`UPDATE customers SET referral_code = COALESCE(NULLIF(referral_code, ''), 'REFJANE1') WHERE id = ? AND organization_id = ?`,
		customer.ID, orgID,
	)

	var staffCount int64
	db.WithContext(ctx).Model(&staffmod.Staff{}).Where("organization_id = ?", orgID).Count(&staffCount)
	if staffCount == 0 {
		branchID := branch.ID
		staff := staffmod.Staff{
			OrganizationID: orgID,
			BranchID:       &branchID,
			DisplayName:    "Alex Barber",
			Title:          "Senior Stylist",
			Email:          "alex@demo-salon.local",
			Phone:          "+254722000001",
			Role:           "senior_barber",
			Bio:            "Specialist in fades and beard sculpting.",
			Specialties:    pq.StringArray{"fade", "beard", "hot towel"},
			IsActive:       true,
			CommissionRate: 15,
		}
		if err := db.WithContext(ctx).Create(&staff).Error; err != nil {
			return err
		}
	}

	var serviceCount int64
	db.WithContext(ctx).Model(&servicesmod.Service{}).Where("organization_id = ?", orgID).Count(&serviceCount)
	if serviceCount == 0 {
		services := []servicesmod.Service{
			{
				OrganizationID:  orgID,
				Name:            "Classic Haircut",
				Category:        "Hair",
				PriceKES:        1500,
				DurationMinutes: 30,
				Description:     "Precision cut and style",
				IsActive:        true,
			},
			{
				OrganizationID:  orgID,
				Name:            "Beard Trim",
				Category:        "Grooming",
				PriceKES:        800,
				DurationMinutes: 20,
				Description:     "Shape and line-up",
				IsActive:        true,
			},
		}
		for i := range services {
			if err := db.WithContext(ctx).Create(&services[i]).Error; err != nil {
				return err
			}
		}
	}

	var productCount int64
	db.WithContext(ctx).Model(&retailmod.Product{}).Where("organization_id = ?", orgID).Count(&productCount)
	if productCount == 0 {
		products := []retailmod.Product{
			{
				OrganizationID: orgID,
				SKU:            "POM-001",
				Name:           "Premium Pomade",
				Category:       "Styling",
				Description:    "High-hold matte finish",
				CostKES:        400,
				PriceKES:       1200,
				Quantity:       24,
				ReorderLevel:   5,
				IsActive:       true,
			},
			{
				OrganizationID: orgID,
				SKU:            "OIL-001",
				Name:           "Beard Oil",
				Category:       "Grooming",
				Description:    "Argan & jojoba blend",
				CostKES:        300,
				PriceKES:       900,
				Quantity:       18,
				ReorderLevel:   4,
				IsActive:       true,
			},
		}
		for i := range products {
			if err := db.WithContext(ctx).Create(&products[i]).Error; err != nil {
				return err
			}
		}
	}

	var count int64
	db.WithContext(ctx).Model(&bookingmod.Booking{}).Where("organization_id = ?", orgID).Count(&count)
	today := time.Now().Format("2006-01-02")
	if count == 0 {
		date, _ := time.Parse("2006-01-02", today)
	var staff staffmod.Staff
	if err := db.WithContext(ctx).Where("organization_id = ?", orgID).First(&staff).Error; err != nil {
		return err
	}
	staffID := staff.ID
	branchID := branch.ID
	booking := bookingmod.Booking{
		OrganizationID: orgID,
		CustomerID:     customer.ID,
		StaffID:        &staffID,
		BranchID:       &branchID,
		BookingDate:    date,
		StartTime:      "10:00",
		EndTime:        "10:30",
		Status:         "scheduled",
		Notes:          "Seeded demo booking",
	}
	if err := db.WithContext(ctx).Create(&booking).Error; err != nil {
		return err
	}
	_ = db.WithContext(ctx).Exec(
		`INSERT INTO booking_services (organization_id, booking_id, service_name, duration_minutes, price_kes)
		 VALUES (?, ?, 'Classic Haircut', 30, 1500)`,
		orgID, booking.ID,
	)

	completedDate, _ := time.Parse("2006-01-02", today)
	completedDate = completedDate.AddDate(0, 0, -2)
	completedBooking := bookingmod.Booking{
		OrganizationID: orgID,
		CustomerID:     customer.ID,
		StaffID:        &staffID,
		BranchID:       &branchID,
		BookingDate:    completedDate,
		StartTime:      "14:00",
		EndTime:        "14:30",
		Status:         "completed",
		Notes:          "Seeded completed visit for reviews",
	}
	if err := db.WithContext(ctx).Create(&completedBooking).Error; err != nil {
		return err
	}
	_ = db.WithContext(ctx).Exec(
		`INSERT INTO booking_services (organization_id, booking_id, service_name, duration_minutes, price_kes)
		 VALUES (?, ?, 'Beard Trim', 20, 800)`,
		orgID, completedBooking.ID,
	)
	}

	_ = db.WithContext(ctx).Exec(`DELETE FROM audit_log WHERE organization_id = ?`, orgID)
	_ = db.WithContext(ctx).Exec(
		`INSERT INTO audit_log (organization_id, action, entity_type, metadata) VALUES
		 (?, 'staff.clock_in', 'attendance', '{"staff":"Alex Barber","branch":"Main"}'),
		 (?, 'booking.created', 'booking', '{"customer":"Jane Client","time":"10:00"}'),
		 (?, 'payment.completed', 'transaction', '{"amount_kes":1500,"service":"Classic Haircut"}')`,
		orgID, orgID, orgID,
	)
	return nil
}

func ensureDemoStaffUser(ctx context.Context, db *gorm.DB, orgID uuid.UUID) error {
	email := strings.ToLower(strings.TrimSpace(staffDemoEmail))
	hash, err := platformauth.HashPassword(staffDemoPassword)
	if err != nil {
		return err
	}

	var user authmod.User
	err = db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}
	if err == gorm.ErrRecordNotFound {
		verifiedAt := time.Now()
		user = authmod.User{Email: email, PasswordHash: hash, EmailVerifiedAt: &verifiedAt}
		if err := db.WithContext(ctx).Create(&user).Error; err != nil {
			return err
		}
		if err := db.WithContext(ctx).Create(&authmod.Profile{UserID: user.ID, FullName: "Alex Barber"}).Error; err != nil {
			return err
		}
	} else {
		verifiedAt := time.Now()
		if err := db.WithContext(ctx).Model(&user).Updates(map[string]any{
			"password_hash":     hash,
			"email_verified_at": verifiedAt,
		}).Error; err != nil {
			return err
		}
		_ = db.WithContext(ctx).Where("user_id = ?", user.ID).Delete(&authmod.UserTwoFactor{}).Error
	}

	var memberCount int64
	db.WithContext(ctx).Model(&tenancymod.OrganizationMember{}).
		Where("organization_id = ? AND user_id = ?", orgID, user.ID).Count(&memberCount)
	if memberCount == 0 {
		if err := db.WithContext(ctx).Create(&tenancymod.OrganizationMember{
			OrganizationID: orgID,
			UserID:         user.ID,
		}).Error; err != nil {
			return err
		}
	}

	var roleCount int64
	db.WithContext(ctx).Model(&tenancymod.UserRole{}).
		Where("organization_id = ? AND user_id = ? AND role = ?", orgID, user.ID, "senior_barber").Count(&roleCount)
	if roleCount == 0 {
		if err := db.WithContext(ctx).Create(&tenancymod.UserRole{
			OrganizationID: orgID,
			UserID:         user.ID,
			Role:           "senior_barber",
		}).Error; err != nil {
			return err
		}
	}

	var staff staffmod.Staff
	if err := db.WithContext(ctx).Where("organization_id = ? AND display_name = ?", orgID, "Alex Barber").First(&staff).Error; err != nil {
		return err
	}
	if staff.UserID == nil || *staff.UserID != user.ID {
		if err := db.WithContext(ctx).Model(&staff).Update("user_id", user.ID).Error; err != nil {
			return err
		}
	}
	return nil
}
