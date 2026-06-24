package features

import (
	"context"
)

type FeatureRow struct {
	Key            string `json:"key"`
	Label          string `json:"label"`
	Description    string `json:"description"`
	Category       string `json:"category"`
	MinPlan        string `json:"minPlan"`
	DefaultEnabled bool   `json:"defaultEnabled"`
	GlobalEnabled  bool   `json:"globalEnabled"`
	Status         string `json:"status"`
}

func (r *Repository) ListCatalog(ctx context.Context) ([]FeatureRow, error) {
	var features []Feature
	if err := r.db.WithContext(ctx).Order("category, key").Find(&features).Error; err != nil {
		return nil, err
	}
	flags, err := r.ListFlags(ctx)
	if err != nil {
		return nil, err
	}
	flagMap := make(map[string]bool, len(flags))
	for _, f := range flags {
		flagMap[f.Key] = f.Enabled
	}

	out := make([]FeatureRow, 0, len(features))
	for _, f := range features {
		globalEnabled := true
		if enabled, ok := flagMap[f.Key]; ok {
			globalEnabled = enabled
		}
		out = append(out, FeatureRow{
			Key:            f.Key,
			Label:          f.Label,
			Description:    f.Description,
			Category:       f.Category,
			MinPlan:        f.MinPlan,
			DefaultEnabled: f.DefaultEnabled,
			GlobalEnabled:  globalEnabled,
			Status:         f.Status,
		})
	}
	return out, nil
}

func (r *Repository) SetGlobalFlag(ctx context.Context, key string, enabled bool) error {
	flag := FeatureFlag{Key: key, Enabled: enabled, RolloutPercent: 100}
	return r.db.WithContext(ctx).Save(&flag).Error
}

func (s *Service) ListCatalog(ctx context.Context) ([]FeatureRow, error) {
	return s.repo.ListCatalog(ctx)
}

func (s *Service) SetGlobalFlag(ctx context.Context, key string, enabled bool) error {
	return s.repo.SetGlobalFlag(ctx, key, enabled)
}
