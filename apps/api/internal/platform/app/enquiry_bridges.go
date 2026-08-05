package app

import (
	"context"

	"github.com/google/uuid"

	bookingmod "github.com/haus-of-wellness/api/internal/modules/booking"
	crmmod "github.com/haus-of-wellness/api/internal/modules/crm"
)

type enquiryCRMBridge struct {
	repo *crmmod.Repository
}

func (b enquiryCRMBridge) FindOrCreateByPhone(ctx context.Context, orgID uuid.UUID, fullName, phone string) (uuid.UUID, error) {
	customer, err := b.repo.FindOrCreateByPhone(ctx, orgID, fullName, phone)
	if err != nil {
		return uuid.Nil, err
	}
	return customer.ID, nil
}

type enquiryBookingBridge struct {
	svc *bookingmod.Service
}

func (b enquiryBookingBridge) CreateFromEnquiry(ctx context.Context, orgID, customerID uuid.UUID, staffID *uuid.UUID, bookingDate, startTime, endTime, notes string) (uuid.UUID, error) {
	booking, err := b.svc.CreateFromEnquiry(ctx, orgID, customerID, staffID, bookingDate, startTime, endTime, notes)
	if err != nil {
		return uuid.Nil, err
	}
	return booking.ID, nil
}
