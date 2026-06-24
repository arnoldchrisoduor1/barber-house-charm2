package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

const userLocalKey = "auth_user"

type UserContext struct {
	ID        uuid.UUID
	ActiveOrg uuid.UUID
	Roles     []string
}

func UserFrom(c *fiber.Ctx) *UserContext {
	if v := c.Locals(userLocalKey); v != nil {
		if u, ok := v.(*UserContext); ok {
			return u
		}
	}
	return nil
}

func JWT(jwtSvc *JWTService, optional bool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := extractToken(c)
		if token == "" {
			if optional {
				return c.Next()
			}
			return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "missing access token")
		}

		claims, err := jwtSvc.ParseAccess(token)
		if err != nil {
			return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "invalid access token")
		}

		userID, err := uuid.Parse(claims.Subject)
		if err != nil {
			return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "invalid subject")
		}

		c.Locals(userLocalKey, &UserContext{
			ID:        userID,
			ActiveOrg: claims.ActiveOrg,
			Roles:     claims.Roles,
		})
		return c.Next()
	}
}

func extractToken(c *fiber.Ctx) string {
	authHeader := c.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		return strings.TrimSpace(authHeader[7:])
	}
	return c.Cookies("access_token")
}
