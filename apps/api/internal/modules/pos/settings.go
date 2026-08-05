package pos

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

const defaultManagerPIN = "1234"

var ErrInvalidManagerPIN = errors.New("invalid manager PIN")

type OrganizationPosSettings struct {
	OrganizationID   uuid.UUID `json:"organization_id" gorm:"type:uuid;primaryKey"`
	ManagerPINHash   string    `json:"-" gorm:"column:manager_pin_hash;not null;default:''"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (OrganizationPosSettings) TableName() string { return "organization_pos_settings" }

func (s *Service) getPosSettings(ctx context.Context, orgID uuid.UUID) (*OrganizationPosSettings, error) {
	row, err := s.repo.GetPosSettings(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if row != nil {
		return row, nil
	}
	hash, err := platformauth.HashPassword(defaultManagerPIN)
	if err != nil {
		return nil, err
	}
	return &OrganizationPosSettings{OrganizationID: orgID, ManagerPINHash: hash}, nil
}

func (s *Service) ValidateManagerPIN(ctx context.Context, orgID uuid.UUID, pin string) error {
	if pin == "" {
		return ErrInvalidManagerPIN
	}
	settings, err := s.getPosSettings(ctx, orgID)
	if err != nil {
		return err
	}
	if settings.ManagerPINHash == "" {
		if pin != defaultManagerPIN {
			return ErrInvalidManagerPIN
		}
		return nil
	}
	ok, err := platformauth.VerifyPassword(settings.ManagerPINHash, pin)
	if err != nil || !ok {
		return ErrInvalidManagerPIN
	}
	return nil
}

func (s *Service) UpdateManagerPIN(ctx context.Context, orgID uuid.UUID, pin string) error {
	if len(pin) < 4 {
		return httpx.ErrConflict
	}
	hash, err := platformauth.HashPassword(pin)
	if err != nil {
		return err
	}
	return s.repo.UpsertPosSettings(ctx, &OrganizationPosSettings{
		OrganizationID: orgID,
		ManagerPINHash: hash,
	})
}
