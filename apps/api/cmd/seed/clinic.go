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
	clinicOrgSlug = "clinic-demo-aesthetics"
	clinicOrgName = "Haus of Aesthetics Demo"
)

func ensureClinicDemoOrg(ctx context.Context, db *gorm.DB, ceoUserID uuid.UUID) error {
	_, branch, err := ensureModeDemoOrg(ctx, db, ceoUserID, modeDemoOrgConfig{
		Slug: clinicOrgSlug, Name: clinicOrgName, BusinessType: "clinic", BranchName: "Clinic Main", Plan: "professional",
	})
	if err != nil {
		return err
	}
	return ensureClinicSampleData(ctx, db, branch.OrganizationID, branch.ID)
}

func ensureClinicSampleData(ctx context.Context, db *gorm.DB, orgID, branchID uuid.UUID) error {
	if err := seedStaffIfEmpty(ctx, db, orgID, branchID, []staffSeedRow{
		{"Dr. Anita Mwangi", "anita@clinic-demo.local", "+254722400001", "Lead Practitioner", []string{"botox", "fillers"}, 15},
		{"Dr. Kevin Omondi", "kevin@clinic-demo.local", "+254722400002", "Aesthetic Practitioner", []string{"laser", "chemical_peel"}, 15},
	}); err != nil {
		return err
	}
	if err := seedServicesIfEmpty(ctx, db, orgID, []serviceSeedRow{
		{"Botox Forehead", "botox", 30, 12000, 5, 10},
		{"Dermal Fillers", "fillers", 45, 18000, 10, 10},
		{"Chemical Peel", "chemical_peel", 60, 8500, 10, 15},
		{"Microneedling", "microneedling", 60, 9500, 10, 10},
		{"Laser Hair Removal", "laser", 45, 7000, 5, 10},
		{"Skin Consultation", "skin_consultation", 30, 3500, 0, 5},
		{"PRP Facial", "prp", 75, 15000, 10, 10},
		{"HydraFacial", "hydrafacial", 60, 11000, 5, 10},
		{"LED Therapy", "led_therapy", 30, 4500, 0, 5},
		{"IV Drip Wellness", "iv_drip", 45, 14000, 5, 10},
	}); err != nil {
		return err
	}
	if err := seedCustomers(ctx, db, orgID, []crmmod.Customer{
		{OrganizationID: orgID, FullName: "Patient Jane Doe", Phone: "+254711500001", Email: "jane.patient@example.com"},
		{OrganizationID: orgID, FullName: "Patient John Kim", Phone: "+254711500002", HasAllergies: true, AllergyNotes: "Lidocaine sensitivity"},
	}); err != nil {
		return err
	}
	if err := seedConsentFormsIfEmpty(ctx, db, orgID, []settingsmod.ConsentForm{
		{OrganizationID: orgID, Title: "Botox Liability Consent", Content: "Botox treatment risks acknowledged.", FormType: "general"},
		{OrganizationID: orgID, Title: "Laser Treatment Consent", Content: "Laser procedure consent.", FormType: "general"},
	}); err != nil {
		return err
	}
	if err := seedPackagesIfEmpty(ctx, db, orgID, []marketingmod.ServicePackage{
		{OrganizationID: orgID, Name: "Peel Series ×3", TotalSessions: 3, ValidDays: 90, PriceKES: 22000, IsActive: true},
	}); err != nil {
		return err
	}
	if err := seedRetailIfEmpty(ctx, db, orgID, []retailmod.Product{
		{OrganizationID: orgID, SKU: "SER-001", Name: "Hyaluronic Serum", Category: "Consumables", PriceKES: 4500, CostKES: 1800, Quantity: 12, ReorderLevel: 3, IsActive: true},
		{OrganizationID: orgID, SKU: "SUN-001", Name: "SPF 50 Clinic Sunscreen", Category: "Retail", PriceKES: 3200, CostKES: 1200, Quantity: 20, ReorderLevel: 5, IsActive: true},
	}); err != nil {
		return err
	}
	if err := seedGalleryIfEmpty(ctx, db, orgID, []settingsmod.GalleryItem{
		{OrganizationID: orgID, Title: "Before/After Peel", ImageURL: "/placeholder/clinic-ba-1.jpg", Category: "before_after"},
	}); err != nil {
		return err
	}
	return seedBookingIfEmpty(ctx, db, orgID, branchID, "Seeded clinic consultation")
}
