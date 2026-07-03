package marketing

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
)

func (h *Handler) LoyaltyWallet(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	phone := c.Query("phone")
	if phone == "" {
		return httpx.ValidationProblem(c, "phone required", nil)
	}
	data, err := h.svc.LoyaltyWallet(c.UserContext(), orgID, phone)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(data)
}

func (h *Handler) LoyaltyRewards(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListLoyaltyRewards(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) RedeemReward(c *fiber.Ctx) error {
	var body struct {
		CustomerID uuid.UUID `json:"customer_id"`
		RewardID   uuid.UUID `json:"reward_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	if err := h.svc.RedeemReward(c.UserContext(), orgID, body.CustomerID, body.RewardID); err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handler) MyReferrals(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	phone := c.Query("phone")
	if phone == "" {
		return httpx.ValidationProblem(c, "phone required", nil)
	}
	data, err := h.svc.MyReferrals(c.UserContext(), orgID, phone)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(data)
}

func (h *Handler) MyReviews(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	phone := c.Query("phone")
	if phone == "" {
		return httpx.ValidationProblem(c, "phone required", nil)
	}
	rows, err := h.svc.MyReviews(c.UserContext(), orgID, phone)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) PortalCreateReview(c *fiber.Ctx) error {
	var dto ReviewDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	if dto.CustomerID == uuid.Nil || dto.Rating < 1 || dto.Rating > 5 {
		return httpx.ValidationProblem(c, "customer_id and rating (1-5) required", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.PortalCreateReview(c.UserContext(), orgID, dto)
	if err != nil {
		if errors.Is(err, httpx.ErrConflict) {
			return httpx.ProblemJSON(c, fiber.StatusConflict, "Conflict", "Complete a service before leaving a review")
		}
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func registerPortalRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	loy := org.Group("/loyalty", authz.RequireFeature(features, "loyalty"))
	loy.Get("/wallet", h.LoyaltyWallet)
	loy.Get("/rewards", h.LoyaltyRewards)
	loy.Post("/redeem", h.RedeemReward)

	ref := org.Group("/referrals", authz.RequireFeature(features, "referrals"))
	ref.Get("/my", h.MyReferrals)

	rev := org.Group("/reviews", authz.RequireFeature(features, "customer_reviews"))
	rev.Get("/my", h.MyReviews)
	rev.Post("/submit", h.PortalCreateReview)
}
