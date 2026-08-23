package shop

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/httpx"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type OrderLineDTO struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int       `json:"quantity"`
}

type CreateOrderDTO struct {
	CustomerName    string         `json:"customer_name"`
	CustomerPhone   string         `json:"customer_phone"`
	CustomerEmail   string         `json:"customer_email"`
	FulfillmentType string         `json:"fulfillment_type"`
	PaymentMethod   string         `json:"payment_method"`
	DeliveryAddress string         `json:"delivery_address"`
	Notes           string         `json:"notes"`
	BranchID        *uuid.UUID     `json:"branch_id"`
	Lines           []OrderLineDTO `json:"lines"`
}

type AdvanceDTO struct {
	Status string `json:"status"`
}

var statusAdvance = map[string]string{
	"pending": "ready",
	"ready":   "fulfilled",
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID, status string) ([]Order, error) {
	return s.repo.ListOrders(ctx, orgID, status)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Order, error) {
	row, err := s.repo.GetOrder(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto CreateOrderDTO) (*Order, error) {
	if dto.CustomerName == "" || dto.CustomerPhone == "" || len(dto.Lines) == 0 {
		return nil, httpx.ErrConflict
	}
	fulfillment := dto.FulfillmentType
	if fulfillment == "" {
		fulfillment = "pickup"
	}
	if fulfillment != "pickup" && fulfillment != "delivery" {
		return nil, httpx.ErrConflict
	}
	payment := dto.PaymentMethod
	if payment == "" {
		payment = "pay_on_pickup"
	}
	// Skip live Pesapal in MVP path — allow pay_on_pickup / cash_on_delivery.
	if payment != "pay_on_pickup" && payment != "cash_on_delivery" && payment != "pesapal" {
		return nil, httpx.ErrConflict
	}
	if fulfillment == "delivery" && dto.DeliveryAddress == "" {
		return nil, httpx.ErrConflict
	}

	items := make([]OrderItem, 0, len(dto.Lines))
	subtotal := 0
	for _, line := range dto.Lines {
		if line.Quantity <= 0 || line.ProductID == uuid.Nil {
			return nil, httpx.ErrConflict
		}
		product, err := s.repo.GetProduct(ctx, orgID, line.ProductID)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, httpx.ErrNotFound
		}
		if err != nil {
			return nil, err
		}
		if product.Quantity < line.Quantity {
			return nil, httpx.ErrConflict
		}
		lineTotal := product.PriceKES * line.Quantity
		pid := product.ID
		items = append(items, OrderItem{
			ProductID:    &pid,
			ProductName:  product.Name,
			SKU:          product.SKU,
			UnitPriceKES: product.PriceKES,
			Quantity:     line.Quantity,
			LineTotalKES: lineTotal,
		})
		subtotal += lineTotal
	}

	num, err := s.repo.NextOrderNumber(ctx, orgID)
	if err != nil {
		return nil, err
	}
	order := &Order{
		OrganizationID:  orgID,
		BranchID:        dto.BranchID,
		OrderNumber:     num,
		Status:          "pending",
		FulfillmentType: fulfillment,
		PaymentMethod:   payment,
		CustomerName:    dto.CustomerName,
		CustomerPhone:   dto.CustomerPhone,
		CustomerEmail:   dto.CustomerEmail,
		DeliveryAddress: dto.DeliveryAddress,
		Notes:           dto.Notes,
		SubtotalKES:     subtotal,
		TotalKES:        subtotal,
	}
	if err := s.repo.CreateOrder(ctx, order, items); err != nil {
		return nil, err
	}
	return order, nil
}

func (s *Service) Advance(ctx context.Context, orgID, id uuid.UUID, dto AdvanceDTO) (*Order, error) {
	order, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if order.Status == "cancelled" || order.Status == "fulfilled" {
		return nil, httpx.ErrConflict
	}

	var next string
	if dto.Status == "cancelled" {
		next = "cancelled"
	} else if dto.Status != "" {
		expected, ok := statusAdvance[order.Status]
		if !ok || dto.Status != expected {
			return nil, httpx.ErrConflict
		}
		next = dto.Status
	} else {
		var ok bool
		next, ok = statusAdvance[order.Status]
		if !ok {
			return nil, httpx.ErrConflict
		}
	}

	updated, err := s.repo.AdvanceAndMaybeDecrement(ctx, orgID, id, next)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, httpx.ErrNotFound
		}
		if strings.Contains(err.Error(), "insufficient stock") {
			return nil, httpx.ErrConflict
		}
		return nil, err
	}
	return updated, nil
}

func (s *Service) Catalog(ctx context.Context, orgID uuid.UUID, category string) ([]map[string]any, error) {
	products, err := s.repo.LoadActiveProducts(ctx, orgID, category)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(products))
	for _, p := range products {
		out = append(out, map[string]any{
			"id":            p.ID,
			"sku":           p.SKU,
			"name":          p.Name,
			"category":      p.Category,
			"description":   p.Description,
			"price_kes":     p.PriceKES,
			"quantity":      p.Quantity,
			"image_url":     p.ImageURL,
			"reorder_level": p.ReorderLevel,
		})
	}
	return out, nil
}

func (s *Service) Product(ctx context.Context, orgID, id uuid.UUID) (map[string]any, error) {
	p, err := s.repo.GetProduct(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":            p.ID,
		"sku":           p.SKU,
		"name":          p.Name,
		"category":      p.Category,
		"description":   p.Description,
		"price_kes":     p.PriceKES,
		"quantity":      p.Quantity,
		"image_url":     p.ImageURL,
		"reorder_level": p.ReorderLevel,
	}, nil
}

func (s *Service) Dashboard(ctx context.Context, orgID uuid.UUID) (map[string]any, error) {
	return s.repo.DashboardStats(ctx, orgID)
}

func (s *Service) ProductQuantity(ctx context.Context, orgID, id uuid.UUID) (int, error) {
	return s.repo.ProductQty(ctx, orgID, id)
}
