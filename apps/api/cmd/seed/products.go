package main

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	marketingmod "github.com/haus-of-wellness/api/internal/modules/marketing"
	retailmod "github.com/haus-of-wellness/api/internal/modules/retail"
)

const (
	productsOrgSlug = "products-demo-store"
	productsOrgName = "Haus of Products Demo"
)

func ensureProductsDemoOrg(ctx context.Context, db *gorm.DB, ceoUserID uuid.UUID) error {
	_, branch, err := ensureModeDemoOrg(ctx, db, ceoUserID, modeDemoOrgConfig{
		Slug: productsOrgSlug, Name: productsOrgName, BusinessType: "products", BranchName: "Main Store", Plan: "professional",
	})
	if err != nil {
		return err
	}
	return ensureProductsSampleData(ctx, db, branch.OrganizationID, branch.ID)
}

func ensureProductsSampleData(ctx context.Context, db *gorm.DB, orgID, branchID uuid.UUID) error {
	if err := seedStaffIfEmpty(ctx, db, orgID, branchID, []staffSeedRow{
		{"Cashier One", "cashier@products-demo.local", "+254722800001", "Cashier", []string{"retail"}, 5},
		{"Sales Associate", "sales@products-demo.local", "+254722800002", "Sales Associate", []string{"retail"}, 5},
	}); err != nil {
		return err
	}
	if err := seedRetailIfEmpty(ctx, db, orgID, []retailmod.Product{
		{OrganizationID: orgID, SKU: "SHM-001", Name: "Moisturizing Shampoo", Category: "Hair Care", PriceKES: 1200, CostKES: 450, Quantity: 48, ReorderLevel: 10, IsActive: true},
		{OrganizationID: orgID, SKU: "CON-001", Name: "Leave-in Conditioner", Category: "Hair Care", PriceKES: 950, CostKES: 350, Quantity: 36, ReorderLevel: 8, IsActive: true},
		{OrganizationID: orgID, SKU: "BEA-001", Name: "Beard Oil 30ml", Category: "Grooming", PriceKES: 850, CostKES: 280, Quantity: 24, ReorderLevel: 6, IsActive: true},
		{OrganizationID: orgID, SKU: "STY-001", Name: "Edge Control", Category: "Styling", PriceKES: 650, CostKES: 200, Quantity: 40, ReorderLevel: 8, IsActive: true},
		{OrganizationID: orgID, SKU: "KIT-001", Name: "Starter Grooming Kit", Category: "Bundles", PriceKES: 3500, CostKES: 1400, Quantity: 15, ReorderLevel: 3, IsActive: true},
		{OrganizationID: orgID, SKU: "GFT-001", Name: "Gift Set Premium", Category: "Gift Sets", PriceKES: 5500, CostKES: 2200, Quantity: 10, ReorderLevel: 2, IsActive: true},
	}); err != nil {
		return err
	}
	if err := seedPackagesIfEmpty(ctx, db, orgID, []marketingmod.ServicePackage{
		{OrganizationID: orgID, Name: "Retail Bundle Kit", Description: "Shampoo + conditioner + oil", PackageType: "kit", TotalSessions: 1, ValidDays: 365, PriceKES: 2800, IsActive: true},
		{OrganizationID: orgID, Name: "Gift Grooming Kit", Description: "Beard oil + edge control", PackageType: "kit", TotalSessions: 1, ValidDays: 365, PriceKES: 1400, IsActive: true},
	}); err != nil {
		return err
	}
	if err := seedCustomers(ctx, db, orgID, []crmmod.Customer{
		{OrganizationID: orgID, FullName: "Walk-in Shopper", Phone: "+254711900001", Email: "shopper@example.com"},
	}); err != nil {
		return err
	}
	return seedBookingIfEmpty(ctx, db, orgID, branchID, "Seeded products appointment")
}
