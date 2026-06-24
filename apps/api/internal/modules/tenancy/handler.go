package tenancy

import (
	"github.com/gofiber/fiber/v2"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetOrg(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	org, err := h.svc.GetOrg(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(org)
}

func (h *Handler) ListMembers(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	members, err := h.svc.ListMembers(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(members)
}

func (h *Handler) ListBranches(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branches, err := h.svc.ListBranches(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(branches)
}

type createBranchRequest struct {
	Name    string `json:"name"`
	Address string `json:"address"`
	Phone   string `json:"phone"`
}

func (h *Handler) CreateBranch(c *fiber.Ctx) error {
	var req createBranchRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	branch, err := h.svc.CreateBranch(c.UserContext(), orgID, req.Name, req.Address, req.Phone)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(branch)
}
