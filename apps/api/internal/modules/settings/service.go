package settings

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func mapNotFound[T any](row *T, err error) (*T, error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

type NotificationSettingsDTO struct {
	EmailReminders       *bool           `json:"email_reminders"`
	SMSReminders         *bool           `json:"sms_reminders"`
	WhatsAppReminders    *bool           `json:"whatsapp_reminders"`
	MarketingEmails      *bool           `json:"marketing_emails"`
	BookingConfirmations *bool           `json:"booking_confirmations"`
	Settings             json.RawMessage `json:"settings"`
}

func (s *Service) GetNotificationSettings(ctx context.Context, orgID uuid.UUID) (*NotificationSettings, error) {
	row, err := s.repo.GetNotificationSettings(ctx, orgID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = &NotificationSettings{
			OrganizationID: orgID,
			Settings:       json.RawMessage(`{}`),
		}
		if err := s.repo.UpsertNotificationSettings(ctx, row); err != nil {
			return nil, err
		}
		return row, nil
	}
	return row, err
}

func (s *Service) UpdateNotificationSettings(ctx context.Context, orgID uuid.UUID, dto NotificationSettingsDTO) (*NotificationSettings, error) {
	row, err := s.GetNotificationSettings(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if dto.EmailReminders != nil {
		row.EmailReminders = *dto.EmailReminders
	}
	if dto.SMSReminders != nil {
		row.SMSReminders = *dto.SMSReminders
	}
	if dto.WhatsAppReminders != nil {
		row.WhatsAppReminders = *dto.WhatsAppReminders
	}
	if dto.MarketingEmails != nil {
		row.MarketingEmails = *dto.MarketingEmails
	}
	if dto.BookingConfirmations != nil {
		row.BookingConfirmations = *dto.BookingConfirmations
	}
	if len(dto.Settings) > 0 {
		row.Settings = dto.Settings
	}
	if err := s.repo.UpsertNotificationSettings(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

type EnquiryDTO struct {
	BranchID *uuid.UUID `json:"branch_id"`
	Name     string     `json:"name"`
	Email    string     `json:"email"`
	Phone    string     `json:"phone"`
	Subject  string     `json:"subject"`
	Message  string     `json:"message"`
	IsRead   *bool      `json:"is_read"`
}

func (s *Service) ListEnquiries(ctx context.Context, orgID uuid.UUID) ([]Enquiry, error) {
	return s.repo.ListEnquiries(ctx, orgID)
}

func (s *Service) GetEnquiry(ctx context.Context, orgID, id uuid.UUID) (*Enquiry, error) {
	return mapNotFound(s.repo.GetEnquiry(ctx, orgID, id))
}

func (s *Service) CreateEnquiry(ctx context.Context, orgID uuid.UUID, dto EnquiryDTO) (*Enquiry, error) {
	row := &Enquiry{
		OrganizationID: orgID,
		BranchID:       dto.BranchID,
		Name:           dto.Name,
		Email:          dto.Email,
		Phone:          dto.Phone,
		Subject:        dto.Subject,
		Message:        dto.Message,
	}
	if err := s.repo.CreateEnquiry(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateEnquiry(ctx context.Context, orgID, id uuid.UUID, dto EnquiryDTO) (*Enquiry, error) {
	row, err := s.GetEnquiry(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.IsRead != nil {
		row.IsRead = *dto.IsRead
	}
	if dto.Subject != "" {
		row.Subject = dto.Subject
	}
	if err := s.repo.UpdateEnquiry(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteEnquiry(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetEnquiry(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteEnquiry(ctx, orgID, id)
}

type StaffChatDTO struct {
	Channel  string     `json:"channel"`
	Message  string     `json:"message"`
	ParentID *uuid.UUID `json:"parent_id"`
	IsPinned *bool      `json:"is_pinned"`
}

func (s *Service) ListStaffChat(ctx context.Context, orgID uuid.UUID, channel string) ([]StaffChatMessage, error) {
	return s.repo.ListStaffChat(ctx, orgID, channel)
}

func (s *Service) CreateStaffChatMessage(ctx context.Context, orgID, senderID uuid.UUID, dto StaffChatDTO) (*StaffChatMessage, error) {
	channel := dto.Channel
	if channel == "" {
		channel = "general"
	}
	row := &StaffChatMessage{
		OrganizationID: orgID,
		Channel:        channel,
		SenderID:       senderID,
		Message:        dto.Message,
		ParentID:       dto.ParentID,
	}
	if dto.IsPinned != nil {
		row.IsPinned = *dto.IsPinned
	}
	if err := s.repo.CreateStaffChatMessage(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteStaffChatMessage(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := mapNotFound(s.repo.GetStaffChatMessage(ctx, orgID, id)); err != nil {
		return err
	}
	return s.repo.DeleteStaffChatMessage(ctx, orgID, id)
}

type OrgBrandingDTO struct {
	LogoURL                    string `json:"logo_url"`
	PrimaryColor               string `json:"primary_color"`
	SecondaryColor             string `json:"secondary_color"`
	AccentColor                string `json:"accent_color"`
	HeadingFont                string `json:"heading_font"`
	BodyFont                   string `json:"body_font"`
	BusinessName               string `json:"business_name"`
	Tagline                    string `json:"tagline"`
	BookingWelcomeMessage      string `json:"booking_welcome_message"`
	BookingConfirmationMessage string `json:"booking_confirmation_message"`
	ShowLogoOnBooking          *bool  `json:"show_logo_on_booking"`
}

func (s *Service) GetOrgBranding(ctx context.Context, orgID uuid.UUID) (*OrgBranding, error) {
	row, err := s.repo.GetOrgBranding(ctx, orgID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = &OrgBranding{OrganizationID: orgID}
		if err := s.repo.UpsertOrgBranding(ctx, row); err != nil {
			return nil, err
		}
		return row, nil
	}
	return row, err
}

func (s *Service) UpdateOrgBranding(ctx context.Context, orgID uuid.UUID, dto OrgBrandingDTO) (*OrgBranding, error) {
	row, err := s.GetOrgBranding(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if dto.LogoURL != "" {
		row.LogoURL = dto.LogoURL
	}
	if dto.PrimaryColor != "" {
		row.PrimaryColor = dto.PrimaryColor
	}
	if dto.SecondaryColor != "" {
		row.SecondaryColor = dto.SecondaryColor
	}
	if dto.AccentColor != "" {
		row.AccentColor = dto.AccentColor
	}
	if dto.HeadingFont != "" {
		row.HeadingFont = dto.HeadingFont
	}
	if dto.BodyFont != "" {
		row.BodyFont = dto.BodyFont
	}
	row.BusinessName = dto.BusinessName
	row.Tagline = dto.Tagline
	row.BookingWelcomeMessage = dto.BookingWelcomeMessage
	row.BookingConfirmationMessage = dto.BookingConfirmationMessage
	if dto.ShowLogoOnBooking != nil {
		row.ShowLogoOnBooking = *dto.ShowLogoOnBooking
	}
	if err := s.repo.UpsertOrgBranding(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

type SeatRentalDTO struct {
	StaffID        *uuid.UUID `json:"staff_id"`
	BranchID       *uuid.UUID `json:"branch_id"`
	SeatLabel      string     `json:"seat_label"`
	MonthlyRateKES int        `json:"monthly_rate_kes"`
	StartedAt      *time.Time `json:"started_at"`
	EndedAt        *time.Time `json:"ended_at"`
	Status         string     `json:"status"`
	Notes          string     `json:"notes"`
}

func (s *Service) ListSeatRentals(ctx context.Context, orgID uuid.UUID) ([]SeatRental, error) {
	return s.repo.ListSeatRentals(ctx, orgID)
}

func (s *Service) GetSeatRental(ctx context.Context, orgID, id uuid.UUID) (*SeatRental, error) {
	return mapNotFound(s.repo.GetSeatRental(ctx, orgID, id))
}

func (s *Service) CreateSeatRental(ctx context.Context, orgID uuid.UUID, dto SeatRentalDTO) (*SeatRental, error) {
	status := dto.Status
	if status == "" {
		status = "active"
	}
	row := &SeatRental{
		OrganizationID: orgID,
		StaffID:        dto.StaffID,
		BranchID:       dto.BranchID,
		SeatLabel:      dto.SeatLabel,
		MonthlyRateKES: dto.MonthlyRateKES,
		StartedAt:      dto.StartedAt,
		EndedAt:        dto.EndedAt,
		Status:         status,
		Notes:          dto.Notes,
	}
	if err := s.repo.CreateSeatRental(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateSeatRental(ctx context.Context, orgID, id uuid.UUID, dto SeatRentalDTO) (*SeatRental, error) {
	row, err := s.GetSeatRental(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.SeatLabel != "" {
		row.SeatLabel = dto.SeatLabel
	}
	if dto.MonthlyRateKES != 0 {
		row.MonthlyRateKES = dto.MonthlyRateKES
	}
	if dto.Status != "" {
		row.Status = dto.Status
	}
	row.Notes = dto.Notes
	if dto.StaffID != nil {
		row.StaffID = dto.StaffID
	}
	if dto.BranchID != nil {
		row.BranchID = dto.BranchID
	}
	row.StartedAt = dto.StartedAt
	row.EndedAt = dto.EndedAt
	if err := s.repo.UpdateSeatRental(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteSeatRental(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetSeatRental(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteSeatRental(ctx, orgID, id)
}

type GalleryItemDTO struct {
	StaffID     *uuid.UUID `json:"staff_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	ImageURL    string     `json:"image_url"`
	Category    string     `json:"category"`
	IsPublic    *bool      `json:"is_public"`
	SortOrder   int        `json:"sort_order"`
}

func (s *Service) ListGalleryItems(ctx context.Context, orgID uuid.UUID) ([]GalleryItem, error) {
	return s.repo.ListGalleryItems(ctx, orgID)
}

func (s *Service) GetGalleryItem(ctx context.Context, orgID, id uuid.UUID) (*GalleryItem, error) {
	return mapNotFound(s.repo.GetGalleryItem(ctx, orgID, id))
}

func (s *Service) CreateGalleryItem(ctx context.Context, orgID uuid.UUID, dto GalleryItemDTO) (*GalleryItem, error) {
	public := true
	if dto.IsPublic != nil {
		public = *dto.IsPublic
	}
	row := &GalleryItem{
		OrganizationID: orgID,
		StaffID:        dto.StaffID,
		Title:          dto.Title,
		Description:    dto.Description,
		ImageURL:       dto.ImageURL,
		Category:       dto.Category,
		IsPublic:       public,
		SortOrder:      dto.SortOrder,
	}
	if err := s.repo.CreateGalleryItem(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateGalleryItem(ctx context.Context, orgID, id uuid.UUID, dto GalleryItemDTO) (*GalleryItem, error) {
	row, err := s.GetGalleryItem(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	row.Title = dto.Title
	row.Description = dto.Description
	if dto.ImageURL != "" {
		row.ImageURL = dto.ImageURL
	}
	row.Category = dto.Category
	if dto.IsPublic != nil {
		row.IsPublic = *dto.IsPublic
	}
	row.SortOrder = dto.SortOrder
	if dto.StaffID != nil {
		row.StaffID = dto.StaffID
	}
	if err := s.repo.UpdateGalleryItem(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteGalleryItem(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetGalleryItem(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteGalleryItem(ctx, orgID, id)
}

type ConsentFormDTO struct {
	CustomerID   *uuid.UUID `json:"customer_id"`
	Title        string     `json:"title"`
	FormType     string     `json:"form_type"`
	Content      string     `json:"content"`
	SignatureURL string     `json:"signature_url"`
	IsSigned     *bool      `json:"is_signed"`
	ExpiresAt    *time.Time `json:"expires_at"`
}

func (s *Service) ListConsentForms(ctx context.Context, orgID uuid.UUID) ([]ConsentForm, error) {
	return s.repo.ListConsentForms(ctx, orgID)
}

func (s *Service) GetConsentForm(ctx context.Context, orgID, id uuid.UUID) (*ConsentForm, error) {
	return mapNotFound(s.repo.GetConsentForm(ctx, orgID, id))
}

func (s *Service) CreateConsentForm(ctx context.Context, orgID uuid.UUID, dto ConsentFormDTO) (*ConsentForm, error) {
	formType := dto.FormType
	if formType == "" {
		formType = "general"
	}
	row := &ConsentForm{
		OrganizationID: orgID,
		CustomerID:     dto.CustomerID,
		Title:          dto.Title,
		FormType:       formType,
		Content:        dto.Content,
		SignatureURL:   dto.SignatureURL,
		ExpiresAt:      dto.ExpiresAt,
	}
	if dto.IsSigned != nil && *dto.IsSigned {
		row.IsSigned = true
		now := time.Now()
		row.SignedAt = &now
	}
	if err := s.repo.CreateConsentForm(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) UpdateConsentForm(ctx context.Context, orgID, id uuid.UUID, dto ConsentFormDTO) (*ConsentForm, error) {
	row, err := s.GetConsentForm(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Title != "" {
		row.Title = dto.Title
	}
	row.Content = dto.Content
	row.SignatureURL = dto.SignatureURL
	if dto.IsSigned != nil && *dto.IsSigned && !row.IsSigned {
		row.IsSigned = true
		now := time.Now()
		row.SignedAt = &now
	}
	row.ExpiresAt = dto.ExpiresAt
	if err := s.repo.UpdateConsentForm(ctx, orgID, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteConsentForm(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetConsentForm(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteConsentForm(ctx, orgID, id)
}

type InboxNotificationDTO struct {
	UserID   *uuid.UUID      `json:"user_id"`
	Title    string          `json:"title"`
	Body     string          `json:"body"`
	Type     string          `json:"type"`
	Metadata json.RawMessage `json:"metadata"`
}

func (s *Service) ListInboxNotifications(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID) ([]InboxNotification, error) {
	return s.repo.ListInboxNotifications(ctx, orgID, userID)
}

func (s *Service) GetInboxNotification(ctx context.Context, orgID, id uuid.UUID) (*InboxNotification, error) {
	return mapNotFound(s.repo.GetInboxNotification(ctx, orgID, id))
}

func (s *Service) CreateInboxNotification(ctx context.Context, orgID uuid.UUID, dto InboxNotificationDTO) (*InboxNotification, error) {
	nType := dto.Type
	if nType == "" {
		nType = "info"
	}
	meta := dto.Metadata
	if len(meta) == 0 {
		meta = json.RawMessage(`{}`)
	}
	row := &InboxNotification{
		OrganizationID: orgID,
		UserID:         dto.UserID,
		Title:          dto.Title,
		Body:           dto.Body,
		Type:           nType,
		Metadata:       meta,
	}
	if err := s.repo.CreateInboxNotification(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) MarkInboxRead(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetInboxNotification(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.MarkInboxRead(ctx, orgID, id)
}

func (s *Service) DeleteInboxNotification(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetInboxNotification(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeleteInboxNotification(ctx, orgID, id)
}

func (s *Service) ListWhatsAppLogs(ctx context.Context, orgID uuid.UUID) ([]WhatsAppLog, error) {
	rows, err := s.repo.ListWhatsAppLogs(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		return []WhatsAppLog{}, nil
	}
	return rows, nil
}
