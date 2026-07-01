package tenancy

import (
	"github.com/gofiber/fiber/v2"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func RegisterRoutes(router fiber.Router, jwt *platformauth.JWTService, checker platformtenancy.MembershipChecker, h *Handler) {
	org := router.Group("/organizations/:org", platformauth.JWT(jwt, false), platformtenancy.ResolveOrganization(checker))
	org.Get("/", h.GetOrg)
	org.Get("/members", h.ListMembers)
	org.Get("/branches", h.ListBranches)
	org.Post("/branches", h.CreateBranch)
	org.Patch("/subscription", h.UpdateSubscription)
}
