package platform

import (
	"context"

	"github.com/google/uuid"

	tenancymod "github.com/haus-of-wellness/api/internal/modules/tenancy"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListOrganizations(ctx context.Context) ([]tenancymod.Organization, error) {
	return s.repo.ListOrganizations(ctx)
}

func (s *Service) IsPlatformAdmin(ctx context.Context, userID uuid.UUID) (bool, error) {
	return s.repo.IsPlatformAdmin(ctx, userID)
}

func (s *Service) Audit(ctx context.Context, actorID *uuid.UUID, action, resourceType, resourceID string) error {
	entry := &AuditLog{
		ActorUserID:  actorID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Metadata:     []byte("{}"),
	}
	return s.repo.AppendAudit(ctx, entry)
}

func (s *Service) RecordOrgAudit(ctx context.Context, orgID uuid.UUID, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, metadata []byte) error {
	return s.repo.AppendOrgAudit(ctx, OrgAuditEntry{
		OrganizationID: orgID,
		UserID:         userID,
		Action:         action,
		EntityType:     entityType,
		EntityID:       entityID,
		Metadata:       metadata,
	})
}
