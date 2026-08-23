package main

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	marketingmod "github.com/haus-of-wellness/api/internal/modules/marketing"
	retailmod "github.com/haus-of-wellness/api/internal/modules/retail"
	settingsmod "github.com/haus-of-wellness/api/internal/modules/settings"
)

const (
	nailsOrgSlug = "nail-demo-studio"
	nailsOrgName = "Haus of Nails Demo"
)

func ensureNailsDemoOrg(ctx context.Context, db *gorm.DB, ceoUserID uuid.UUID) error {
	_, branch, err := ensureModeDemoOrg(ctx, db, ceoUserID, modeDemoOrgConfig{
		Slug: nailsOrgSlug, Name: nailsOrgName, BusinessType: "nail_bar", BranchName: "Nail Bar Main", Plan: "professional",
	})
	if err != nil {
		return err
	}
	return ensureNailsSampleData(ctx, db, branch.OrganizationID, branch.ID)
}

func ensureNailsSampleData(ctx context.Context, db *gorm.DB, orgID, branchID uuid.UUID) error {
	if err := seedStaffIfEmpty(ctx, db, orgID, branchID, []staffSeedRow{
		{"Diana Ochieng", "diana@nails-demo.local", "+254722300001", "Senior Nail Tech", []string{"gel_nails", "nail_art"}, 12},
		{"Lisa Wanjiru", "lisa@nails-demo.local", "+254722300002", "Nail Tech", []string{"manicure", "pedicure"}, 12},
		{"Carol Mutiso", "carol@nails-demo.local", "+254722300003", "Nail Tech", []string{"acrylic_nails", "dip_powder"}, 12},
	}); err != nil {
		return err
	}
	if err := seedServicesIfEmpty(ctx, db, orgID, []serviceSeedRow{
		{"Classic Manicure", "manicure", 45, 1500, 0, 5},
		{"Spa Pedicure", "pedicure", 60, 2200, 0, 5},
		{"Gel Overlay", "gel_nails", 75, 2800, 0, 5},
		{"Acrylic Full Set", "acrylic_nails", 90, 3500, 0, 10},
		{"Nail Art Accent", "nail_art", 30, 800, 0, 5},
		{"Dip Powder Manicure", "dip_powder", 60, 2600, 0, 5},
		{"Nail Repair", "nail_repair", 30, 600, 0, 5},
		{"Shellac Polish", "shellac", 45, 1800, 0, 5},
		{"Paraffin Wax Treatment", "paraffin_wax", 20, 900, 0, 5},
		{"Nail Extensions", "nail_extensions", 120, 4500, 0, 10},
		{"French Tip Gel", "gel_nails", 60, 2400, 0, 5},
		{"Kids Manicure", "manicure", 30, 900, 0, 5},
		{"Bridal Nail Package", "nail_art", 150, 8000, 0, 10},
	}); err != nil {
		return err
	}
	if err := seedCustomers(ctx, db, orgID, []crmmod.Customer{
		{OrganizationID: orgID, FullName: "Michelle Adongo", Phone: "+254711400001", Email: "michelle@example.com", LoyaltyTier: "gold"},
		{OrganizationID: orgID, FullName: "Ruth Kamau", Phone: "+254711400002", HasAllergies: true, AllergyNotes: "Acrylic monomer sensitivity"},
	}); err != nil {
		return err
	}
	if err := seedConsentFormsIfEmpty(ctx, db, orgID, []settingsmod.ConsentForm{
		{OrganizationID: orgID, Title: "Gel Polish Allergy Form", Content: "Gel and UV exposure consent.", FormType: "general"},
	}); err != nil {
		return err
	}
	if err := seedLoyaltyIfEmpty(ctx, db, orgID, []marketingmod.LoyaltyReward{
		{OrganizationID: orgID, Name: "Free Nail Art Add-on", Description: "60 points", PointsRequired: 60, RewardType: "service", IsActive: true},
	}); err != nil {
		return err
	}
	if err := seedGalleryIfEmpty(ctx, db, orgID, []settingsmod.GalleryItem{
		{OrganizationID: orgID, Title: "Chrome Ombré Set", ImageURL: "/placeholder/nail-art-1.jpg", Category: "nail_art"},
		{OrganizationID: orgID, Title: "Floral Accent Tips", ImageURL: "/placeholder/nail-art-2.jpg", Category: "nail_art"},
	}); err != nil {
		return err
	}
	if err := seedRetailIfEmpty(ctx, db, orgID, []retailmod.Product{
		{OrganizationID: orgID, SKU: "CUT-001", Name: "Cuticle Oil", Category: "Nail Care", PriceKES: 650, CostKES: 200, Quantity: 30, ReorderLevel: 5, IsActive: true},
	}); err != nil {
		return err
	}
	return seedBookingIfEmpty(ctx, db, orgID, branchID, "Seeded nail appointment")
}
