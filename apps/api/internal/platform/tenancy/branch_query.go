package tenancy

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// OptionalBranchID reads an optional branch_id query parameter for org-scoped list filters.
func OptionalBranchID(c *fiber.Ctx) *uuid.UUID {
	raw := c.Query("branch_id")
	if raw == "" {
		return nil
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return nil
	}
	return &id
}
