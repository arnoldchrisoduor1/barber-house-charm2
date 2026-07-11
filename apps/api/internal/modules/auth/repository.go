package auth

import (
	"context"
	"errors"
	"time"

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

func (r *Repository) StaffIDForUser(ctx context.Context, orgID, userID uuid.UUID) (*uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.WithContext(ctx).Table("staff").
		Where("organization_id = ? AND user_id = ? AND is_active = true", orgID, userID).
		Select("id").Scan(&id).Error
	if err != nil || id == uuid.Nil {
		return nil, nil
	}
	return &id, nil
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

func (r *Repository) CreateEmailVerificationToken(ctx context.Context, row *EmailVerificationToken) error {
	_ = r.db.WithContext(ctx).Where("user_id = ?", row.UserID).Delete(&EmailVerificationToken{}).Error
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) FindEmailVerificationToken(ctx context.Context, token string) (*EmailVerificationToken, error) {
	var row EmailVerificationToken
	err := r.db.WithContext(ctx).Where("token = ?", token).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &row, err
}

func (r *Repository) MarkEmailVerified(ctx context.Context, userID uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&User{}).Where("id = ?", userID).
		Update("email_verified_at", now).Error
}

func (r *Repository) DeleteEmailVerificationTokens(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&EmailVerificationToken{}).Error
}

func (r *Repository) CreateStaffInvite(ctx context.Context, row *StaffInvite) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *Repository) ListStaffInvites(ctx context.Context, orgID uuid.UUID) ([]StaffInvite, error) {
	var rows []StaffInvite
	err := r.db.WithContext(ctx).Where("organization_id = ?", orgID).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) FindStaffInviteByToken(ctx context.Context, token string) (*StaffInvite, error) {
	var row StaffInvite
	err := r.db.WithContext(ctx).Where("token = ?", token).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &row, err
}

func (r *Repository) FindPendingStaffInviteByEmail(ctx context.Context, email string) (*StaffInvite, error) {
	var row StaffInvite
	err := r.db.WithContext(ctx).
		Where("LOWER(email) = ? AND accepted_at IS NULL AND expires_at > NOW()", email).
		Order("created_at DESC").
		First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &row, err
}

func (r *Repository) MarkStaffInviteAccepted(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&StaffInvite{}).Where("id = ?", id).
		Update("accepted_at", now).Error
}

func (r *Repository) LinkStaffUser(ctx context.Context, staffID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Table("staff").Where("id = ?", staffID).
		Update("user_id", userID).Error
}
