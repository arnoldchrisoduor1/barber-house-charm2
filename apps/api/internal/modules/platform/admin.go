package platform

import (
	"context"

	"github.com/google/uuid"

	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

type SubscriptionRow struct {
	OrganizationID   uuid.UUID  `json:"organizationId"`
	OrganizationName string     `json:"organizationName"`
	Plan             string     `json:"plan"`
	Status           string     `json:"status"`
	TrialEndsAt      *string    `json:"trialEndsAt,omitempty"`
}

func (r *Repository) ListSubscriptions(ctx context.Context) ([]SubscriptionRow, error) {
	var rows []SubscriptionRow
	err := r.db.WithContext(ctx).
		Table("subscriptions s").
		Select(`s.organization_id, o.name as organization_name, s.plan, s.status, s.trial_ends_at`).
		Joins("JOIN organizations o ON o.id = s.organization_id").
		Order("s.created_at DESC").
		Limit(200).
		Scan(&rows).Error
	return rows, err
}

func (s *Service) ListSubscriptions(ctx context.Context) ([]SubscriptionRow, error) {
	return s.repo.ListSubscriptions(ctx)
}

func (s *Service) ListOrganizationsWrapped(ctx context.Context) ([]tenancymod.Organization, error) {
	return s.repo.ListOrganizations(ctx)
}

type AuditEntry struct {
	ID             uuid.UUID `json:"id"`
	OrganizationID *uuid.UUID `json:"organizationId,omitempty"`
	Action         string    `json:"action"`
	EntityType     string    `json:"entityType,omitempty"`
	CreatedAt      string    `json:"createdAt"`
}

func (r *Repository) ListAuditLog(ctx context.Context, orgID *uuid.UUID, limit int) ([]AuditEntry, error) {
	q := r.db.WithContext(ctx).Table("audit_log").Order("created_at DESC").Limit(limit)
	if orgID != nil {
		q = q.Where("organization_id = ?", *orgID)
	}
	var rows []AuditEntry
	err := q.Find(&rows).Error
	return rows, err
}

func (s *Service) ListAuditLog(ctx context.Context, orgID *uuid.UUID) ([]AuditEntry, error) {
	return s.repo.ListAuditLog(ctx, orgID, 100)
}
