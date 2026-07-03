package auth

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func setAuthCookies(c *fiber.Ctx, resp *AuthResponse) {
	secure := c.Protocol() == "https"
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    resp.AccessToken,
		HTTPOnly: true,
		Secure:   secure,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   int(resp.ExpiresIn),
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    resp.RefreshToken,
		HTTPOnly: true,
		Secure:   secure,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   7 * 24 * 3600,
	})
}

func clearAuthCookies(c *fiber.Ctx) {
	secure := c.Protocol() == "https"
	c.Cookie(&fiber.Cookie{Name: "access_token", Value: "", HTTPOnly: true, Secure: secure, Path: "/", MaxAge: -1})
	c.Cookie(&fiber.Cookie{Name: "refresh_token", Value: "", HTTPOnly: true, Secure: secure, Path: "/", MaxAge: -1})
}

func (h *Handler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	resp, err := h.svc.Register(c.UserContext(), req)
	if err != nil {
		if errors.Is(err, ErrInvalidRole) {
			return httpx.ValidationProblem(c, "invalid role", map[string]any{
				"role": "must be one of ceo, director, branch_manager, senior_barber, junior_barber, receptionist",
			})
		}
		return httpx.From(c, err)
	}
	setAuthCookies(c, resp)
	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	resp, err := h.svc.Login(c.UserContext(), req)
	if err != nil {
		return httpx.From(c, err)
	}
	if !resp.Requires2FA {
		setAuthCookies(c, resp)
	}
	return c.JSON(resp)
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	token := req.RefreshToken
	if token == "" {
		token = c.Cookies("refresh_token")
	}
	resp, err := h.svc.Refresh(c.UserContext(), token)
	if err != nil {
		return httpx.From(c, err)
	}
	setAuthCookies(c, resp)
	return c.JSON(resp)
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	clearAuthCookies(c)
	if err := h.svc.Logout(c.UserContext()); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) Me(c *fiber.Ctx) error {
	user := platformauth.UserFrom(c)
	if user == nil {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
	}
	resp, err := h.svc.Me(c.UserContext(), user.ID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(resp)
}

func (h *Handler) Setup2FA(c *fiber.Ctx) error {
	user := platformauth.UserFrom(c)
	if user == nil {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
	}
	if err := h.svc.Setup2FA(c.UserContext(), user.ID); err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"status": "otp_sent"})
}

func (h *Handler) Verify2FA(c *fiber.Ctx) error {
	user := platformauth.UserFrom(c)
	if user == nil {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
	}
	var req TwoFAOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	if err := h.svc.Verify2FA(c.UserContext(), user.ID, req.OTP); err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"enabled": true})
}

func (h *Handler) Disable2FA(c *fiber.Ctx) error {
	user := platformauth.UserFrom(c)
	if user == nil {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
	}
	var req TwoFAOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	if err := h.svc.Disable2FA(c.UserContext(), user.ID, req.OTP); err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"enabled": false})
}

func (h *Handler) TwoFactorStatus(c *fiber.Ctx) error {
	user := platformauth.UserFrom(c)
	if user == nil {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
	}
	enabled, err := h.svc.TwoFactorStatus(c.UserContext(), user.ID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"enabled": enabled})
}

func (h *Handler) Challenge2FA(c *fiber.Ctx) error {
	var req TwoFAChallengeRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	resp, err := h.svc.Complete2FAChallenge(c.UserContext(), req.ChallengeToken, req.OTP)
	if err != nil {
		return httpx.From(c, err)
	}
	setAuthCookies(c, resp)
	return c.JSON(resp)
}

func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	user := platformauth.UserFrom(c)
	if user == nil {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
	}
	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	if err := h.svc.ChangePassword(c.UserContext(), user.ID, req); err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}
