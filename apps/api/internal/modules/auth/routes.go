package auth

import (
	"github.com/gofiber/fiber/v2"

	"github.com/haus-of-wellness/api/internal/platform/authz"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
)

func RegisterRoutes(router fiber.Router, jwt *platformauth.JWTService, h *Handler) {
	auth := router.Group("/auth")
	auth.Post("/register", h.Register)
	auth.Post("/login", h.Login)
	auth.Post("/refresh", h.Refresh)
	auth.Post("/logout", h.Logout)
	auth.Post("/verify-email", h.VerifyEmail)
	auth.Post("/accept-invite", h.AcceptInvite)
	auth.Get("/invite-preview", h.PreviewInvite)
	auth.Get("/staff-membership", h.LookupStaffMembership)
	auth.Post("/change-password", platformauth.JWT(jwt, false), h.ChangePassword)
	auth.Post("/2fa/challenge", h.Challenge2FA)
	auth.Post("/select-org", platformauth.JWT(jwt, false), h.SelectOrg)

	twoFA := router.Group("/auth/2fa", platformauth.JWT(jwt, false))
	twoFA.Post("/setup", h.Setup2FA)
	twoFA.Post("/verify", h.Verify2FA)
	twoFA.Post("/disable", h.Disable2FA)
	twoFA.Get("/status", h.TwoFactorStatus)

	me := router.Group("/me", platformauth.JWT(jwt, false))
	me.Get("/", h.Me)

	public := router.Group("/public")
	public.Get("/orgs", h.ListPublicOrgs)
}

func RegisterOrgRoutes(org fiber.Router, h *Handler) {
	invites := org.Group("/staff-invites", authz.RequireRole("ceo", "director", "branch_manager"))
	invites.Get("/", h.ListStaffInvites)
	invites.Post("/", h.CreateStaffInvite)
}
