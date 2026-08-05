package ledger

import (
	"bytes"
	"encoding/csv"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	featuremod "github.com/haus-of-wellness/api/internal/modules/features"
	platformauth "github.com/haus-of-wellness/api/internal/platform/auth"
	"github.com/haus-of-wellness/api/internal/platform/authz"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) List(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	rows, err := h.svc.List(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(rows)
}

func (h *Handler) Balance(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	resp, err := h.svc.Balance(c.UserContext(), orgID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(resp)
}

func (h *Handler) ListExpenses(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	rows, err := h.svc.ListExpenses(c.UserContext(), orgID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(fiber.Map{"data": rows})
}

func (h *Handler) CreateExpense(c *fiber.Ctx) error {
	var dto ExpenseDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	var userID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		userID = &u.ID
	}
	row, err := h.svc.CreateExpense(c.UserContext(), orgID, userID, dto)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(row)
}

func (h *Handler) UpdateExpense(c *fiber.Ctx) error {
	var dto ExpenseDTO
	if err := c.BodyParser(&dto); err != nil {
		return httpx.ValidationProblem(c, "invalid request body", nil)
	}
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	var userID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		userID = &u.ID
	}
	row, err := h.svc.UpdateExpense(c.UserContext(), orgID, id, dto, userID)
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

// ExportExpensesCSV streams every expense in the (optionally branch-scoped) org as CSV for
// the accountant — no hardcoded months, whatever is currently in the ledger.
func (h *Handler) ExportExpensesCSV(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	branchID := platformtenancy.OptionalBranchID(c)
	rows, err := h.svc.ListExpenses(c.UserContext(), orgID, branchID)
	if err != nil {
		return httpx.From(c, err)
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{"date", "category", "description", "amount_kes", "receipt_url"})
	for _, e := range rows {
		_ = w.Write([]string{
			e.ExpenseDate.Format("2006-01-02"),
			e.Category,
			e.Description,
			strconv.FormatInt(e.AmountKES, 10),
			e.ReceiptURL,
		})
	}
	w.Flush()

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", `attachment; filename="expenses.csv"`)
	return c.Send(buf.Bytes())
}

const maxReceiptBytes = 10 << 20 // 10MB

func (h *Handler) UploadExpenseReceipt(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	file, err := c.FormFile("file")
	if err != nil {
		return httpx.ValidationProblem(c, "file is required", nil)
	}
	if file.Size > maxReceiptBytes {
		return httpx.ValidationProblem(c, "file too large (max 10MB)", nil)
	}
	f, err := file.Open()
	if err != nil {
		return httpx.From(c, err)
	}
	defer f.Close()
	data := make([]byte, file.Size)
	if _, err := f.Read(data); err != nil {
		return httpx.From(c, err)
	}
	var userID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		userID = &u.ID
	}
	row, err := h.svc.UploadExpenseReceipt(c.UserContext(), orgID, id, userID, file.Filename, data, file.Header.Get("Content-Type"))
	if err != nil {
		return httpx.From(c, err)
	}
	return c.JSON(row)
}

func (h *Handler) DeleteExpense(c *fiber.Ctx) error {
	orgID := platformtenancy.OrgIDFrom(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.ValidationProblem(c, "invalid id", nil)
	}
	var userID *uuid.UUID
	if u := platformauth.UserFrom(c); u != nil {
		userID = &u.ID
	}
	if err := h.svc.DeleteExpense(c.UserContext(), orgID, id, userID); err != nil {
		return httpx.From(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func RegisterOrgRoutes(org fiber.Router, features *featuremod.Service, h *Handler) {
	g := org.Group("/ledger", authz.RequireFeature(features, "basic_reports"))
	g.Get("/entries", h.List)
	g.Get("/balance", h.Balance)

	fg := org.Group("/finance", authz.RequireFeature(features, "basic_reports"))
	fg.Get("/expenses", h.ListExpenses)
	fg.Get("/expenses/export.csv", h.ExportExpensesCSV)
	fg.Post("/expenses", h.CreateExpense)
	fg.Put("/expenses/:id", h.UpdateExpense)
	fg.Delete("/expenses/:id", h.DeleteExpense)
	fg.Post("/expenses/:id/receipt", h.UploadExpenseReceipt)
}
