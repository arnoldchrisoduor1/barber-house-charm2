package features

import (
	"context"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Service struct {
	repo *Repository
	reg  *Registry
}

func NewService(repo *Repository, reg *Registry) *Service {
	return &Service{repo: repo, reg: reg}
}

func (s *Service) SyncCatalog(ctx context.Context) error {
	return s.repo.SyncCatalog(ctx, s.reg)
}

func (s *Service) EffectiveFeatures(ctx context.Context, orgID uuid.UUID) ([]string, error) {
	plan, err := s.repo.GetOrgPlan(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("get org plan: %w", err)
	}
	if plan == "" {
		plan = "starter"
	}

	flags, err := s.repo.ListFlags(ctx)
	if err != nil {
		return nil, err
	}
	flagMap := make(map[string]bool, len(flags))
	for _, f := range flags {
		flagMap[f.Key] = f.Enabled
	}

	overrides, err := s.repo.ListOrgOverrides(ctx, orgID)
	if err != nil {
		return nil, err
	}
	overrideMap := make(map[string]bool, len(overrides))
	for _, o := range overrides {
		overrideMap[o.FeatureKey] = o.Enabled
	}

	enabled := make(map[string]bool, len(s.reg.Features))
	for _, entry := range s.reg.Features {
		key := entry.Key

		if global, ok := flagMap[key]; ok && !global {
			enabled[key] = false
			continue
		}
		if override, ok := overrideMap[key]; ok {
			enabled[key] = override
			continue
		}
		if PlanRank(plan, s.reg.PlanHierarchy) >= PlanRank(entry.MinPlan, s.reg.PlanHierarchy) {
			enabled[key] = true
			continue
		}
		enabled[key] = entry.Default
	}

	for _, entry := range s.reg.Features {
		if !enabled[entry.Key] {
			continue
		}
		for _, dep := range entry.DependsOn {
			if !enabled[dep] {
				enabled[entry.Key] = false
				break
			}
		}
	}

	var out []string
	for key, on := range enabled {
		if on {
			out = append(out, key)
		}
	}
	return out, nil
}

func (s *Service) HasFeature(c *fiber.Ctx, key string) (bool, error) {
	orgID := tenancy.OrgIDFrom(c)
	if orgID == uuid.Nil {
		if user := platformauth.UserFrom(c); user != nil && user.ActiveOrg != uuid.Nil {
			orgID = user.ActiveOrg
		}
	}
	if orgID == uuid.Nil {
		return false, nil
	}
	features, err := s.EffectiveFeatures(c.UserContext(), orgID)
	if err != nil {
		return false, err
	}
	for _, f := range features {
		if f == key {
			return true, nil
		}
	}
	return false, nil
}
