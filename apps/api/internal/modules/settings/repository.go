package settings

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func listRows[T any](r *Repository, ctx context.Context, orgID uuid.UUID, order string) ([]T, error) {
	var rows []T
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID))
	if order != "" {
		q = q.Order(order)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func getRow[T any](r *Repository, ctx context.Context, orgID, id uuid.UUID) (*T, error) {
	var row T
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func createRow[T any](r *Repository, ctx context.Context, row *T) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func updateRow[T any](r *Repository, ctx context.Context, orgID uuid.UUID, row *T) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(row).Error
}

func deleteRow[T any](r *Repository, ctx context.Context, orgID, id uuid.UUID) error {
	var zero T
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&zero, "id = ?", id).Error
}

func (r *Repository) GetNotificationSettings(ctx context.Context, orgID uuid.UUID) (*NotificationSettings, error) {
	var row NotificationSettings
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row).Error
	return &row, err
}

func (r *Repository) UpsertNotificationSettings(ctx context.Context, row *NotificationSettings) error {
	return r.db.WithContext(ctx).Save(row).Error
}

func (r *Repository) ListEnquiries(ctx context.Context, orgID uuid.UUID) ([]Enquiry, error) {
	return listRows[Enquiry](r, ctx, orgID, "created_at DESC")
}

func (r *Repository) GetEnquiry(ctx context.Context, orgID, id uuid.UUID) (*Enquiry, error) {
	return getRow[Enquiry](r, ctx, orgID, id)
}

func (r *Repository) CreateEnquiry(ctx context.Context, row *Enquiry) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateEnquiry(ctx context.Context, orgID uuid.UUID, row *Enquiry) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteEnquiry(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[Enquiry](r, ctx, orgID, id)
}

func (r *Repository) ListStaffChat(ctx context.Context, orgID uuid.UUID, channel string) ([]StaffChatMessage, error) {
	var rows []StaffChatMessage
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at ASC")
	if channel != "" {
		q = q.Where("channel = ?", channel)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *Repository) GetStaffChatMessage(ctx context.Context, orgID, id uuid.UUID) (*StaffChatMessage, error) {
	return getRow[StaffChatMessage](r, ctx, orgID, id)
}

func (r *Repository) CreateStaffChatMessage(ctx context.Context, row *StaffChatMessage) error {
	return createRow(r, ctx, row)
}

func (r *Repository) DeleteStaffChatMessage(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[StaffChatMessage](r, ctx, orgID, id)
}

func (r *Repository) GetOrgBranding(ctx context.Context, orgID uuid.UUID) (*OrgBranding, error) {
	var row OrgBranding
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row).Error
	return &row, err
}

func (r *Repository) UpsertOrgBranding(ctx context.Context, row *OrgBranding) error {
	return r.db.WithContext(ctx).Save(row).Error
}

func (r *Repository) ListSeatRentals(ctx context.Context, orgID uuid.UUID) ([]SeatRental, error) {
	return listRows[SeatRental](r, ctx, orgID, "seat_label ASC")
}

func (r *Repository) GetSeatRental(ctx context.Context, orgID, id uuid.UUID) (*SeatRental, error) {
	return getRow[SeatRental](r, ctx, orgID, id)
}

func (r *Repository) CreateSeatRental(ctx context.Context, row *SeatRental) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateSeatRental(ctx context.Context, orgID uuid.UUID, row *SeatRental) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteSeatRental(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[SeatRental](r, ctx, orgID, id)
}

func (r *Repository) ListGalleryItems(ctx context.Context, orgID uuid.UUID) ([]GalleryItem, error) {
	return listRows[GalleryItem](r, ctx, orgID, "sort_order ASC, created_at DESC")
}

func (r *Repository) GetGalleryItem(ctx context.Context, orgID, id uuid.UUID) (*GalleryItem, error) {
	return getRow[GalleryItem](r, ctx, orgID, id)
}

func (r *Repository) CreateGalleryItem(ctx context.Context, row *GalleryItem) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateGalleryItem(ctx context.Context, orgID uuid.UUID, row *GalleryItem) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteGalleryItem(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[GalleryItem](r, ctx, orgID, id)
}

func (r *Repository) ListConsentForms(ctx context.Context, orgID uuid.UUID) ([]ConsentForm, error) {
	return listRows[ConsentForm](r, ctx, orgID, "created_at DESC")
}

func (r *Repository) GetConsentForm(ctx context.Context, orgID, id uuid.UUID) (*ConsentForm, error) {
	return getRow[ConsentForm](r, ctx, orgID, id)
}

func (r *Repository) CreateConsentForm(ctx context.Context, row *ConsentForm) error {
	return createRow(r, ctx, row)
}

func (r *Repository) UpdateConsentForm(ctx context.Context, orgID uuid.UUID, row *ConsentForm) error {
	return updateRow(r, ctx, orgID, row)
}

func (r *Repository) DeleteConsentForm(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[ConsentForm](r, ctx, orgID, id)
}

func (r *Repository) ListInboxNotifications(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID) ([]InboxNotification, error) {
	var rows []InboxNotification
	q := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC")
	if userID != nil {
		q = q.Where("user_id IS NULL OR user_id = ?", *userID)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func (r *Repository) GetInboxNotification(ctx context.Context, orgID, id uuid.UUID) (*InboxNotification, error) {
	return getRow[InboxNotification](r, ctx, orgID, id)
}

func (r *Repository) CreateInboxNotification(ctx context.Context, row *InboxNotification) error {
	return createRow(r, ctx, row)
}

func (r *Repository) MarkInboxRead(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Model(&InboxNotification{}).
		Where("id = ?", id).
		Update("read_at", gorm.Expr("now()")).Error
}

func (r *Repository) DeleteInboxNotification(ctx context.Context, orgID, id uuid.UUID) error {
	return deleteRow[InboxNotification](r, ctx, orgID, id)
}

func (r *Repository) ListWhatsAppLogs(ctx context.Context, orgID uuid.UUID) ([]WhatsAppLog, error) {
	var rows []WhatsAppLog
	err := r.db.WithContext(ctx).
		Table("notification_deliveries").
		Scopes(platformtenancy.OrgScope(orgID)).
		Where("channel = ?", "whatsapp").
		Order("created_at DESC").
		Find(&rows).Error
	return rows, err
}
