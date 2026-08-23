package main

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
	marketingmod "github.com/haus-of-wellness/api/internal/modules/marketing"
	settingsmod "github.com/haus-of-wellness/api/internal/modules/settings"
)

const (
	therapyOrgSlug = "therapy-demo-practice"
	therapyOrgName = "Haus of Therapy Demo"
)

func ensureTherapyDemoOrg(ctx context.Context, db *gorm.DB, ceoUserID uuid.UUID) error {
	_, branch, err := ensureModeDemoOrg(ctx, db, ceoUserID, modeDemoOrgConfig{
		Slug: therapyOrgSlug, Name: therapyOrgName, BusinessType: "therapy", BranchName: "Therapy Practice", Plan: "professional",
	})
	if err != nil {
		return err
	}
	return ensureTherapySampleData(ctx, db, branch.OrganizationID, branch.ID)
}

func ensureTherapySampleData(ctx context.Context, db *gorm.DB, orgID, branchID uuid.UUID) error {
	if err := seedStaffIfEmpty(ctx, db, orgID, branchID, []staffSeedRow{
		{"Dr. Helen Njoki", "helen@therapy-demo.local", "+254722600001", "Senior Therapist", []string{"counselling", "cbt"}, 10},
		{"James Physio", "james@therapy-demo.local", "+254722600002", "Physiotherapist", []string{"physiotherapy", "sports_therapy"}, 10},
	}); err != nil {
		return err
	}
	if err := seedServicesIfEmpty(ctx, db, orgID, []serviceSeedRow{
		{"Initial Assessment", "physiotherapy", 60, 4500, 0, 10},
		{"CBT Session", "cbt", 50, 5000, 0, 10},
		{"Counselling Session", "counselling", 50, 4800, 0, 10},
		{"Sports Therapy", "sports_therapy", 60, 5500, 0, 10},
		{"Pain Management", "pain_management", 45, 4200, 0, 10},
		{"Stress Management", "stress_management", 45, 4000, 0, 10},
		{"Couples Therapy", "couples_therapy", 75, 7500, 0, 10},
		{"Child Therapy", "child_therapy", 45, 4500, 0, 10},
		{"Occupational Therapy", "occupational_therapy", 60, 5200, 0, 10},
		{"Rehabilitation Block", "rehabilitation", 60, 5000, 0, 10},
		{"Mental Health Check-in", "mental_health", 30, 3500, 0, 5},
		{"Follow-up Session", "physiotherapy", 45, 3800, 0, 10},
		{"Group Stress Workshop", "stress_management", 90, 6000, 0, 10},
	}); err != nil {
		return err
	}
	if err := seedCustomers(ctx, db, orgID, []crmmod.Customer{
		{OrganizationID: orgID, FullName: "Client Sam Otieno", Phone: "+254711700001", Email: "sam@example.com"},
		{OrganizationID: orgID, FullName: "Client Mary Wambui", Phone: "+254711700002", Email: "mary@example.com"},
	}); err != nil {
		return err
	}
	if err := seedConsentFormsIfEmpty(ctx, db, orgID, []settingsmod.ConsentForm{
		{OrganizationID: orgID, Title: "Therapy Intake Consent", Content: "Consent to therapy services.", FormType: "general"},
	}); err != nil {
		return err
	}
	if err := seedPackagesIfEmpty(ctx, db, orgID, []marketingmod.ServicePackage{
		{OrganizationID: orgID, Name: "Session Pack ×6", TotalSessions: 6, ValidDays: 90, PriceKES: 25000, IsActive: true},
		{OrganizationID: orgID, Name: "Solo 5-Pack", TotalSessions: 5, ValidDays: 60, PriceKES: 20000, IsActive: true},
	}); err != nil {
		return err
	}
	return seedBookingIfEmpty(ctx, db, orgID, branchID, "Seeded therapy session")
}
