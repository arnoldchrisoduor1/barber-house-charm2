package main

import (
	"context"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"

	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	marketingmod "github.com/haus-of-wellness/api/internal/modules/marketing"
	staffmod "github.com/haus-of-wellness/api/internal/modules/staff"
)

const (
	soloOrgSlug = "solo-demo-pro"
	soloOrgName = "Haus of Solo Pro Demo"
)

func ensureSoloDemoOrg(ctx context.Context, db *gorm.DB, ceoUserID uuid.UUID) error {
	specialty := "barber"
	specPtr := &specialty
	org, branch, err := ensureModeDemoOrg(ctx, db, ceoUserID, modeDemoOrgConfig{
		Slug: soloOrgSlug, Name: soloOrgName, BusinessType: "solo_pro", BranchName: "Solo Workspace", Plan: "solo_pro", Specialty: specPtr,
	})
	if err != nil {
		return err
	}
	return ensureSoloSampleData(ctx, db, org.ID, branch.ID, ceoUserID)
}

func ensureSoloSampleData(ctx context.Context, db *gorm.DB, orgID, branchID, ceoUserID uuid.UUID) error {
	var staffCount int64
	db.WithContext(ctx).Model(&staffmod.Staff{}).Where("organization_id = ?", orgID).Count(&staffCount)
	if staffCount == 0 {
		bid := branchID
		row := staffmod.Staff{
			OrganizationID: orgID,
			BranchID:       &bid,
			DisplayName:    "Solo Pro Demo",
			Title:          "Owner Operator",
			Email:          "solo@solo-demo.local",
			Phone:          "+254722700001",
			Role:           "senior_barber",
			UserID:         &ceoUserID,
			Specialties:    pq.StringArray{"consultation", "service", "premium"},
			IsActive:       true,
			CommissionRate: 100,
		}
		if err := db.WithContext(ctx).Create(&row).Error; err != nil {
			return err
		}
	}
	if err := seedServicesIfEmpty(ctx, db, orgID, []serviceSeedRow{
		{"Consultation", "consultation", 30, 1500, 0, 5},
		{"Standard Service", "service", 45, 2500, 0, 5},
		{"Premium Service", "premium", 60, 4000, 0, 5},
	}); err != nil {
		return err
	}
	if err := seedCustomers(ctx, db, orgID, []crmmod.Customer{
		{OrganizationID: orgID, FullName: "Regular Client", Phone: "+254711800001", Email: "client@example.com", LoyaltyTier: "silver"},
	}); err != nil {
		return err
	}
	if err := seedLoyaltyIfEmpty(ctx, db, orgID, []marketingmod.LoyaltyReward{
		{OrganizationID: orgID, Name: "Solo 5-Pack Discount", Description: "Loyalty reward", PointsRequired: 50, RewardType: "discount", RewardValue: 10, IsActive: true},
	}); err != nil {
		return err
	}
	return seedBookingIfEmpty(ctx, db, orgID, branchID, "Seeded solo booking")
}
