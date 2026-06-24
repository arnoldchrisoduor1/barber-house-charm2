package features

import (
	"encoding/json"

	apicontracts "github.com/haus-of-wellness/api/contracts"
)

// Mirrors packages/contracts/domain/features.json (embedded at build time).

type Registry struct {
	PlanHierarchy []string         `json:"planHierarchy"`
	Features      []FeatureEntry   `json:"features"`
}

type FeatureEntry struct {
	Key         string   `json:"key"`
	Label       string   `json:"label"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	MinPlan     string   `json:"minPlan"`
	Default     bool     `json:"default"`
	DependsOn   []string `json:"dependsOn"`
	Status      string   `json:"status"`
}

func LoadRegistry() (*Registry, error) {
	var reg Registry
	if err := json.Unmarshal(apicontracts.FeaturesJSON, &reg); err != nil {
		return nil, err
	}
	return &reg, nil
}

func PlanRank(plan string, hierarchy []string) int {
	for i, p := range hierarchy {
		if p == plan {
			return i
		}
	}
	return -1
}
