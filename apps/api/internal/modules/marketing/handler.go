package marketing

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func parseID(c *fiber.Ctx) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return uuid.Nil, httpx.ValidationProblem(c, "invalid id", nil)
	}
	return id, nil
}

func (h *Handler) ListPromotions(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListPromotions(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetPromotion(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetPromotion(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreatePromotion(c *fiber.Ctx) error {
	var dto PromotionDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreatePromotion(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdatePromotion(c *fiber.Ctx) error {
	var dto PromotionDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdatePromotion(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeletePromotion(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeletePromotion(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListReferrals(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListReferrals(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetReferral(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetReferral(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateReferral(c *fiber.Ctx) error {
	var dto ReferralDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateReferral(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateReferral(c *fiber.Ctx) error {
	var dto ReferralDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateReferral(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteReferral(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteReferral(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListLoyaltyRewards(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListLoyaltyRewards(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetLoyaltyReward(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetLoyaltyReward(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateLoyaltyReward(c *fiber.Ctx) error {
	var dto LoyaltyRewardDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateLoyaltyReward(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateLoyaltyReward(c *fiber.Ctx) error {
	var dto LoyaltyRewardDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateLoyaltyReward(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteLoyaltyReward(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteLoyaltyReward(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListReviews(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListReviews(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetReview(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetReview(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateReview(c *fiber.Ctx) error {
	var dto ReviewDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateReview(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateReview(c *fiber.Ctx) error {
	var dto ReviewDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateReview(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteReview(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteReview(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListServicePackages(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListServicePackages(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetServicePackage(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetServicePackage(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateServicePackage(c *fiber.Ctx) error {
	var dto ServicePackageDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateServicePackage(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateServicePackage(c *fiber.Ctx) error {
	var dto ServicePackageDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateServicePackage(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteServicePackage(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteServicePackage(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListCustomerPackages(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListCustomerPackages(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetCustomerPackage(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetCustomerPackage(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateCustomerPackage(c *fiber.Ctx) error {
	var dto CustomerPackageDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateCustomerPackage(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateCustomerPackage(c *fiber.Ctx) error {
	var dto CustomerPackageDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateCustomerPackage(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteCustomerPackage(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteCustomerPackage(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListGiftCards(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListGiftCards(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetGiftCard(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetGiftCard(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateGiftCard(c *fiber.Ctx) error {
	var dto GiftCardDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateGiftCard(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateGiftCard(c *fiber.Ctx) error {
	var dto GiftCardDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateGiftCard(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteGiftCard(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteGiftCard(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ListGiftCardRedemptions(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListGiftCardRedemptions(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetGiftCardRedemption(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetGiftCardRedemption(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateGiftCardRedemption(c *fiber.Ctx) error {
	var dto GiftCardRedemptionDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateGiftCardRedemption(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) ListCampaigns(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.ListCampaigns(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) GetCampaign(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.GetCampaign(c.UserContext(), orgID, id)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) CreateCampaign(c *fiber.Ctx) error {
	var dto CampaignDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	row, err := h.svc.CreateCampaign(c.UserContext(), orgID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateCampaign(c *fiber.Ctx) error {
	var dto CampaignDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.svc.UpdateCampaign(c.UserContext(), orgID, id, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteCampaign(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if err := h.svc.DeleteCampaign(c.UserContext(), orgID, id); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	// Portal /my and /submit routes must register before admin /:id catch-alls on the same paths.
	registerPortalRoutes(org, features, h)

	promo := org.Group("/promotions", authz.RequireFeature(features, "promotions"))
	promo.Get("/", h.ListPromotions)
	promo.Post("/", h.CreatePromotion)
	promo.Get("/:id", h.GetPromotion)
	promo.Put("/:id", h.UpdatePromotion)
	promo.Delete("/:id", h.DeletePromotion)

	ref := org.Group("/referrals", authz.RequireFeature(features, "referrals"))
	ref.Get("/", h.ListReferrals)
	ref.Post("/", h.CreateReferral)
	ref.Get("/:id", h.GetReferral)
	ref.Put("/:id", h.UpdateReferral)
	ref.Delete("/:id", h.DeleteReferral)

	loyalty := org.Group("/loyalty-rewards", authz.RequireFeature(features, "loyalty"))
	loyalty.Get("/", h.ListLoyaltyRewards)
	loyalty.Post("/", h.CreateLoyaltyReward)
	loyalty.Get("/:id", h.GetLoyaltyReward)
	loyalty.Put("/:id", h.UpdateLoyaltyReward)
	loyalty.Delete("/:id", h.DeleteLoyaltyReward)

	reviews := org.Group("/reviews", authz.RequireFeature(features, "marketing"))
	reviews.Get("/", h.ListReviews)
	reviews.Post("/", h.CreateReview)
	reviews.Get("/:id", h.GetReview)
	reviews.Put("/:id", h.UpdateReview)
	reviews.Delete("/:id", h.DeleteReview)

	pkgs := org.Group("/service-packages", authz.RequireFeature(features, "marketing"))
	pkgs.Get("/", h.ListServicePackages)
	pkgs.Post("/", h.CreateServicePackage)
	pkgs.Get("/:id", h.GetServicePackage)
	pkgs.Put("/:id", h.UpdateServicePackage)
	pkgs.Delete("/:id", h.DeleteServicePackage)

	custPkgs := org.Group("/customer-packages", authz.RequireFeature(features, "marketing"))
	custPkgs.Get("/", h.ListCustomerPackages)
	custPkgs.Post("/", h.CreateCustomerPackage)
	custPkgs.Get("/:id", h.GetCustomerPackage)
	custPkgs.Put("/:id", h.UpdateCustomerPackage)
	custPkgs.Delete("/:id", h.DeleteCustomerPackage)

	gift := org.Group("/gift-cards", authz.RequireFeature(features, "marketing"))
	gift.Get("/", h.ListGiftCards)
	gift.Post("/", h.CreateGiftCard)
	gift.Get("/:id", h.GetGiftCard)
	gift.Put("/:id", h.UpdateGiftCard)
	gift.Delete("/:id", h.DeleteGiftCard)

	giftRed := org.Group("/gift-card-redemptions", authz.RequireFeature(features, "marketing"))
	giftRed.Get("/", h.ListGiftCardRedemptions)
	giftRed.Post("/", h.CreateGiftCardRedemption)
	giftRed.Get("/:id", h.GetGiftCardRedemption)

	campaigns := org.Group("/marketing-campaigns", authz.RequireFeature(features, "marketing"))
	campaigns.Get("/", h.ListCampaigns)
	campaigns.Post("/", h.CreateCampaign)
	campaigns.Get("/:id", h.GetCampaign)
	campaigns.Put("/:id", h.UpdateCampaign)
	campaigns.Delete("/:id", h.DeleteCampaign)
}
