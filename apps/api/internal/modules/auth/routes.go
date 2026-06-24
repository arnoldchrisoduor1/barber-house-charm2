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

	me := router.Group("/me", platformauth.JWT(jwt, false))
	me.Get("/", h.Me)
}
