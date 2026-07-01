package auth

import (
	"github.com/gofiber/fiber/v2"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
)

func RegisterRoutes(router fiber.Router, jwt *platformauth.JWTService, h *Handler) {
	auth := router.Group("/auth")
	auth.Post("/register", h.Register)
	auth.Post("/login", h.Login)
	auth.Post("/refresh", h.Refresh)
	auth.Post("/logout", h.Logout)
	auth.Post("/2fa/challenge", h.Challenge2FA)

	twoFA := router.Group("/auth/2fa", platformauth.JWT(jwt, false))
	twoFA.Post("/setup", h.Setup2FA)
	twoFA.Post("/verify", h.Verify2FA)
	twoFA.Post("/disable", h.Disable2FA)
	twoFA.Get("/status", h.TwoFactorStatus)

	me := router.Group("/me", platformauth.JWT(jwt, false))
	me.Get("/", h.Me)
}
