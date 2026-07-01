package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindUserByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &user, err
}

func (r *Repository) FindUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var user User
	err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpxNotFound()
	}
	return &user, err
}

func (r *Repository) FindProfile(ctx context.Context, userID uuid.UUID) (*Profile, error) {
	var profile Profile
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&profile).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &Profile{UserID: userID}, nil
	}
	return &profile, err
}

func httpxNotFound() error {
	return gorm.ErrRecordNotFound
}

func (r *Repository) DB() *gorm.DB {
	return r.db
}

func (r *Repository) FindTwoFactor(ctx context.Context, userID uuid.UUID) (*UserTwoFactor, error) {
	var row UserTwoFactor
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &row, err
}

func (r *Repository) UpsertTwoFactor(ctx context.Context, row *UserTwoFactor) error {
	var existing UserTwoFactor
	err := r.db.WithContext(ctx).Where("user_id = ?", row.UserID).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.WithContext(ctx).Create(row).Error
	}
	if err != nil {
		return err
	}
	existing.IsEnabled = row.IsEnabled
	existing.EnabledAt = row.EnabledAt
	return r.db.WithContext(ctx).Save(&existing).Error
}

func (r *Repository) DisableTwoFactor(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&UserTwoFactor{}).Where("user_id = ?", userID).
		Updates(map[string]any{"is_enabled": false, "enabled_at": nil}).Error
}
