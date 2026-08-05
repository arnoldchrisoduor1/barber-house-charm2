package tenancy

import (
	"github.com/gofiber/fiber/v2"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/authz"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

func RegisterRoutes(
	router fiber.Router,
	jwt *platformauth.JWTService,
	checker platformtenancy.MembershipChecker,
	features *featuremod.Service,
	h *Handler,
) {
	org := router.Group("/organizations/:org", platformauth.JWT(jwt, false), platformtenancy.ResolveOrganization(checker))
	org.Get("/", h.GetOrg)
	org.Get("/members", h.ListMembers)
	org.Get("/branches", h.ListBranches)
	org.Post("/branches", authz.RequireFeature(features, "multi_branch"), h.CreateBranch)
	org.Put("/branches/:id", authz.RequireFeature(features, "multi_branch"), h.UpdateBranch)
	org.Patch("/subscription", h.UpdateSubscription)
}
