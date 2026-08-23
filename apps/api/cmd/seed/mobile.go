package main

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
)

const (
	mobileOrgSlug = "mobile-demo-pros"
	mobileOrgName = "Haus of Mobile Demo"
)

func ensureMobileDemoOrg(ctx context.Context, db *gorm.DB, ceoUserID uuid.UUID) error {
	specialty := "barber"
	specPtr := &specialty
	_, branch, err := ensureModeDemoOrg(ctx, db, ceoUserID, modeDemoOrgConfig{
		Slug: mobileOrgSlug, Name: mobileOrgName, BusinessType: "mobile", BranchName: "Mobile HQ", Plan: "professional", Specialty: specPtr,
	})
	if err != nil {
		return err
	}
	return ensureMobileSampleData(ctx, db, branch.OrganizationID, branch.ID)
}

func ensureMobileSampleData(ctx context.Context, db *gorm.DB, orgID, branchID uuid.UUID) error {
	if err := seedStaffIfEmpty(ctx, db, orgID, branchID, []staffSeedRow{
		{"Tom Barasa", "tom@mobile-demo.local", "+254722500001", "Mobile Pro", []string{"home_haircut", "home_styling"}, 20},
		{"Winnie Chepkoech", "winnie@mobile-demo.local", "+254722500002", "Mobile Pro", []string{"mobile_nails", "event_styling"}, 20},
	}); err != nil {
		return err
	}
	if err := seedServicesIfEmpty(ctx, db, orgID, []serviceSeedRow{
		{"Home Haircut", "home_haircut", 45, 2500, 0, 10},
		{"Home Styling", "home_styling", 60, 3500, 0, 10},
		{"Home Makeup", "home_makeup", 90, 6000, 0, 10},
		{"Event Styling", "event_styling", 120, 12000, 0, 15},
		{"Mobile Massage", "mobile_massage", 60, 5000, 0, 10},
		{"Mobile Manicure", "mobile_nails", 60, 2200, 0, 10},
		{"Bridal On-Location Package", "bridal_package", 240, 25000, 0, 15},
		{"Group Booking (4+)", "group_booking", 180, 18000, 0, 15},
		{"Kids Home Haircut", "home_haircut", 30, 1800, 0, 10},
		{"Corporate Grooming", "home_styling", 90, 8000, 0, 10},
		{"VIP Home Visit", "home_haircut", 60, 4500, 0, 10},
		{"Weekend Event Package", "event_styling", 150, 15000, 0, 15},
	}); err != nil {
		return err
	}
	if err := seedCustomers(ctx, db, orgID, []crmmod.Customer{
		{OrganizationID: orgID, FullName: "Home Client A", Phone: "+254711600001", Email: "home.a@example.com"},
		{OrganizationID: orgID, FullName: "Home Client B", Phone: "+254711600002", Email: "home.b@example.com"},
	}); err != nil {
		return err
	}
	if err := seedCoverageZonesIfEmpty(ctx, db, orgID); err != nil {
		return err
	}
	if err := seedBookingIfEmpty(ctx, db, orgID, branchID, "Seeded home visit"); err != nil {
		return err
	}
	return seedFieldJobsIfEmpty(ctx, db, orgID)
}
