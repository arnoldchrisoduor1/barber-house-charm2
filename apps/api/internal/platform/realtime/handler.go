package realtime

import (
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Handler struct {
	hub   *Hub
	token *TokenService
}

func NewHandler(hub *Hub, token *TokenService) *Handler {
	return &Handler{hub: hub, token: token}
}

type IssueTokenDTO struct {
	Channels []string `json:"channels"`
}

func (h *Handler) IssueToken(c *fiber.Ctx) error {
	user := platformauth.UserFrom(c)
	if user == nil {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "authentication required")
	}

	orgID := platformtenancy.OrgIDFrom(c)
	if orgID == uuid.Nil {
		if user.ActiveOrg != uuid.Nil {
			orgID = user.ActiveOrg
		} else {
			return httpx.ValidationProblem(c, "organization context required", nil)
		}
	}

	var dto IssueTokenDTO
	_ = c.BodyParser(&dto)

	token, exp, err := h.token.Issue(orgID, user.ID, dto.Channels)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{
		"token":      token,
		"expires_at": exp.UTC().Format(time.RFC3339),
		"channels":   channelsOrDefault(dto.Channels, orgID),
	})
}

func (h *Handler) WSUpgrade(c *fiber.Ctx) error {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "missing realtime token")
	}
	claims, err := h.token.Parse(tokenStr)
	if err != nil {
		return httpx.ProblemJSON(c, fiber.StatusUnauthorized, "Unauthorized", "invalid realtime token")
	}

	if orgParam := c.Params("org"); orgParam != "" {
		pathOrgID := platformtenancy.OrgIDFrom(c)
		if pathOrgID != uuid.Nil && pathOrgID != claims.OrgID {
			return httpx.ProblemJSON(c, fiber.StatusForbidden, "Forbidden", "token org mismatch")
		}
	}

	c.Locals("realtime_claims", claims)
	return c.Next()
}

func (h *Handler) WS(c *websocket.Conn) {
	claims, ok := c.Locals("realtime_claims").(*TokenClaims)
	if !ok || claims == nil {
		_ = c.Close()
		return
	}

	chSet := make(map[string]struct{}, len(claims.Channels))
	for _, ch := range claims.Channels {
		chSet[ch] = struct{}{}
	}

	cl := &client{
		orgID:    claims.OrgID,
		channels: chSet,
		send:     make(chan []byte, 16),
	}
	h.hub.Register(cl, claims.Channels)
	defer h.hub.Unregister(cl)

	go func() {
		for msg := range cl.send {
			if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		}
	}()

	for {
		if _, _, err := c.ReadMessage(); err != nil {
			break
		}
	}
}

func channelsOrDefault(channels []string, orgID uuid.UUID) []string {
	if len(channels) > 0 {
		return channels
	}
	return []string{QueueChannel(orgID)}
}

func RegisterRoutes(v1 fiber.Router, org fiber.Router, jwtSvc *platformauth.JWTService, h *Handler) {
	rt := v1.Group("/realtime")
	rt.Post("/token", platformauth.JWT(jwtSvc, false), h.IssueToken)
	rt.Get("/ws", h.WSUpgrade, websocket.New(h.WS))

	if org != nil {
		org.Get("/ws", h.WSUpgrade, websocket.New(h.WS))
	}
}