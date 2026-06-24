package tenancy

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

const orgLocalKey = "org_id"

type MembershipChecker interface {
	UserBelongsToOrg(ctx context.Context, userID uuid.UUID, orgRef string) (uuid.UUID, error)
}

func OrgIDFrom(c *fiber.Ctx) uuid.UUID {
	if v := c.Locals(orgLocalKey); v != nil {
		if id, ok := v.(uuid.UUID); ok {
			return id
		}
	}
	return uuid.Nil
}

func ResolveOrganization(checker MembershipChecker) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := platformauth.UserFrom(c)
		if user == nil {
			return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
		}

		orgRef := c.Params("org")
		if orgRef == "" {
			return c.Next()
		}

		orgID, err := checker.UserBelongsToOrg(c.UserContext(), user.ID, orgRef)
		if err != nil {
			return httpx.From(c, err)
		}

		c.Locals(orgLocalKey, orgID)
		return c.Next()
	}
}
