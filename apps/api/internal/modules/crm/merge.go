package crm

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type CustomerTag struct {
	database.Base
	OrganizationID uuid.UUID `json:"organization_id" gorm:"type:uuid;not null;index"`
	Name           string    `json:"name" gorm:"not null"`
	Color          string    `json:"color" gorm:"not null;default:bg-primary"`
}

func (CustomerTag) TableName() string { return "customer_tags" }
func (CustomerTag) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*CustomerTag)(nil)

type CustomerPhoto struct {
	database.Base
	OrganizationID uuid.UUID `json:"organization_id" gorm:"type:uuid;not null;index"`
	CustomerID     uuid.UUID `json:"customer_id" gorm:"type:uuid;not null;index"`
	PhotoType      string    `json:"photo_type" gorm:"not null;default:after"`
	ServiceName    string    `json:"service_name"`
	ImageURL       string    `json:"image_url" gorm:"not null"`
	TakenAt        string    `json:"taken_at" gorm:"type:date"`
}

func (CustomerPhoto) TableName() string { return "customer_photos" }
func (CustomerPhoto) IsTenantScoped()   {}

type MergeCustomersDTO struct {
	PrimaryID uuid.UUID   `json:"primary_id"`
	MergeIDs  []uuid.UUID `json:"merge_ids"`
}

type CreateTagDTO struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type SetCustomerTagsDTO struct {
	TagIDs []uuid.UUID `json:"tag_ids"`
}

type CreatePhotoDTO struct {
	PhotoType   string `json:"photo_type"`
	ServiceName string `json:"service_name"`
	ImageURL    string `json:"image_url"`
	TakenAt     string `json:"taken_at"`
}

func (s *Service) MergeCustomers(ctx context.Context, orgID uuid.UUID, actorID *uuid.UUID, dto MergeCustomersDTO) (*Customer, error) {
	if dto.PrimaryID == uuid.Nil || len(dto.MergeIDs) == 0 {
		return nil, httpx.ErrConflict
	}
	primary, err := s.Get(ctx, orgID, dto.PrimaryID)
	if err != nil {
		return nil, err
	}
	if err := s.repo.MergeCustomers(ctx, orgID, primary.ID, dto.MergeIDs); err != nil {
		return nil, err
	}
	merged, err := s.Get(ctx, orgID, primary.ID)
	if err != nil {
		return nil, err
	}
	if s.audit != nil {
		meta, _ := json.Marshal(map[string]any{
			"primary_id": primary.ID,
			"merge_ids":  dto.MergeIDs,
		})
		cid := primary.ID
		_ = s.audit.RecordOrgAudit(ctx, orgID, actorID, "customer.merge", "customer", &cid, meta)
	}
	return merged, nil
}

func (s *Service) ListTags(ctx context.Context, orgID uuid.UUID) ([]CustomerTag, error) {
	return s.repo.ListTags(ctx, orgID)
}

func (s *Service) CreateTag(ctx context.Context, orgID uuid.UUID, dto CreateTagDTO) (*CustomerTag, error) {
	if dto.Name == "" {
		return nil, httpx.ErrConflict
	}
	color := dto.Color
	if color == "" {
		color = "bg-primary"
	}
	tag := &CustomerTag{OrganizationID: orgID, Name: dto.Name, Color: color}
	if err := s.repo.CreateTag(ctx, tag); err != nil {
		return nil, err
	}
	return tag, nil
}

func (s *Service) DeleteTag(ctx context.Context, orgID, id uuid.UUID) error {
	return s.repo.DeleteTag(ctx, orgID, id)
}

func (s *Service) SetCustomerTags(ctx context.Context, orgID, customerID uuid.UUID, dto SetCustomerTagsDTO) error {
	if _, err := s.Get(ctx, orgID, customerID); err != nil {
		return err
	}
	return s.repo.SetCustomerTags(ctx, orgID, customerID, dto.TagIDs)
}

func (s *Service) ListCustomerPhotos(ctx context.Context, orgID, customerID uuid.UUID) ([]CustomerPhoto, error) {
	if _, err := s.Get(ctx, orgID, customerID); err != nil {
		return nil, err
	}
	return s.repo.ListCustomerPhotos(ctx, orgID, customerID)
}

func (s *Service) CreateCustomerPhoto(ctx context.Context, orgID, customerID uuid.UUID, dto CreatePhotoDTO) (*CustomerPhoto, error) {
	if _, err := s.Get(ctx, orgID, customerID); err != nil {
		return nil, err
	}
	if dto.ImageURL == "" {
		return nil, httpx.ErrConflict
	}
	photoType := dto.PhotoType
	if photoType == "" {
		photoType = "after"
	}
	row := &CustomerPhoto{
		OrganizationID: orgID,
		CustomerID:     customerID,
		PhotoType:      photoType,
		ServiceName:    dto.ServiceName,
		ImageURL:       dto.ImageURL,
		TakenAt:        dto.TakenAt,
	}
	if err := s.repo.CreateCustomerPhoto(ctx, row); err != nil {
		return nil, err
	}
	return row, nil
}

func (s *Service) DeleteCustomerPhoto(ctx context.Context, orgID, customerID, photoID uuid.UUID) error {
	return s.repo.DeleteCustomerPhoto(ctx, orgID, customerID, photoID)
}
