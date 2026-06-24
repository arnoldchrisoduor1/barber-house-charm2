package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/config"
	"github.com/haus-of-wellness/api/internal/platform/database"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	authmod "github.com/haus-of-wellness/api/internal/modules/auth"
	bookingmod "github.com/haus-of-wellness/api/internal/modules/booking"
	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	platformmod "github.com/haus-of-wellness/api/internal/modules/platform"
	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

const (
	demoEmail    = "demo@haus.local"
	demoPassword = "demo12345"
	demoOrgSlug  = "demo-salon"
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

	_ = userID
	log.Printf("seed complete: %s / %s (org slug %s)", demoEmail, demoPassword, demoOrgSlug)
}

func ensureDemoOrg(ctx context.Context, db *gorm.DB) (*tenancymod.Organization, uuid.UUID, error) {
	var existing authmod.User
	err := db.WithContext(ctx).Where("email = ?", demoEmail).First(&existing).Error
	if err == nil {
		var org tenancymod.Organization
		if err := db.WithContext(ctx).Where("slug = ?", demoOrgSlug).First(&org).Error; err != nil {
			return nil, uuid.Nil, err
		}
		if err := ensureOrgLinks(ctx, db, org.ID, existing.ID); err != nil {
			return nil, uuid.Nil, err
		}
		return &org, existing.ID, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, uuid.Nil, err
	}

	hash, err := platformauth.HashPassword(demoPassword)
	if err != nil {
		return nil, uuid.Nil, err
	}

	user := authmod.User{Email: demoEmail, PasswordHash: hash}
	if err := db.WithContext(ctx).Create(&user).Error; err != nil {
		return nil, uuid.Nil, err
	}
	if err := db.WithContext(ctx).Create(&authmod.Profile{UserID: user.ID, FullName: "Demo CEO"}).Error; err != nil {
		return nil, uuid.Nil, err
	}

	org := tenancymod.Organization{
		Name:         "Demo Haus Salon",
		Slug:         demoOrgSlug,
		BusinessType: "barber",
	}
	if err := db.WithContext(ctx).Create(&org).Error; err != nil {
		return nil, uuid.Nil, err
	}
	if err := ensureOrgLinks(ctx, db, org.ID, user.ID); err != nil {
		return nil, uuid.Nil, err
	}

	platformRepo := platformmod.NewRepository(db)
	_ = platformRepo.AppendAudit(ctx, &platformmod.AuditLog{
		ActorUserID:  &user.ID,
		Action:       "seed.demo_created",
		ResourceType: "organization",
		ResourceID:   org.ID.String(),
	})

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
			Plan:           "professional",
			Status:         "trial",
			TrialEndsAt:    &trialEnds,
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
	var customer crmmod.Customer
	err := db.WithContext(ctx).Where("organization_id = ? AND phone = ?", orgID, "+254711000001").First(&customer).Error
	if err != nil {
		customer = crmmod.Customer{
			OrganizationID: orgID,
			FullName:     "Jane Client",
			Phone:        "+254711000001",
			Email:        "jane@example.com",
		}
		if err := db.WithContext(ctx).Create(&customer).Error; err != nil {
			return err
		}
	}

	var count int64
	db.WithContext(ctx).Model(&bookingmod.Booking{}).Where("organization_id = ?", orgID).Count(&count)
	if count > 0 {
		return nil
	}

	today := time.Now().Format("2006-01-02")
	date, _ := time.Parse("2006-01-02", today)
	booking := bookingmod.Booking{
		OrganizationID: orgID,
		CustomerID:   customer.ID,
		BookingDate:  date,
		StartTime:    "10:00",
		EndTime:      "10:30",
		Status:       "scheduled",
		Notes:        "Seeded demo booking",
	}
	return db.WithContext(ctx).Create(&booking).Error
}
