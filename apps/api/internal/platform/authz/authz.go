package authz

import (
	"slices"

	"github.com/gofiber/fiber/v2"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

var roleRank = map[string]int{
	"ceo":            7,
	"director":       6,
	"branch_manager": 5,
	"senior_barber":  4,
	"junior_barber":  3,
	"receptionist":   2,
	"customer":       1,
}

func HighestRole(roles []string) string {
	best := ""
	bestRank := -1
	for _, r := range roles {
		if rank, ok := roleRank[r]; ok && rank > bestRank {
			best = r
			bestRank = rank
		}
	}
	return best
}

func IsManagement(roles []string) bool {
	for _, r := range roles {
		if r == "ceo" || r == "director" || r == "branch_manager" {
			return true
		}
	}
	return false
}

func IsStaff(roles []string) bool {
	for _, r := range roles {
		if r != "customer" {
			return true
		}
	}
	return false
}

func RequireRole(allowed ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := platformauth.UserFrom(c)
		if user == nil {
			return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
		}
		for _, role := range user.Roles {
			if slices.Contains(allowed, role) {
				return c.Next()
			}
		}
		return httpx.ProblemJSON(c, fiber.StatusForbidden, "Forbidden", "insufficient role")
	}
}

type FeatureChecker interface {
	HasFeature(c *fiber.Ctx, key string) (bool, error)
}

func RequireFeature(checker FeatureChecker, key string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ok, err := checker.HasFeature(c, key)
		if err != nil {
			return httpx.From(c, err)
		}
		if !ok {
			return httpx.ProblemJSON(c, fiber.StatusForbidden, "Forbidden", "feature not enabled")
		}
		return c.Next()
	}
}
