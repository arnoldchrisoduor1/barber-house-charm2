package inventory

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type StockTake struct {
	database.Base
	OrganizationID uuid.UUID        `json:"organization_id" gorm:"type:uuid;not null;index"`
	Label          string           `json:"label" gorm:"not null;default:''"`
	Status         string           `json:"status" gorm:"not null;default:draft"`
	Notes          string           `json:"notes"`
	FinalizedAt    *time.Time       `json:"finalized_at,omitempty"`
	Lines          []StockTakeLine  `json:"lines,omitempty" gorm:"foreignKey:StockTakeID"`
}

func (StockTake) TableName() string { return "stock_takes" }
func (StockTake) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*StockTake)(nil)

type StockTakeLine struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CreatedAt      time.Time `json:"created_at"`
	OrganizationID uuid.UUID `json:"organization_id" gorm:"type:uuid;not null;index"`
	StockTakeID    uuid.UUID `json:"stock_take_id" gorm:"type:uuid;not null;index"`
	InventoryID    uuid.UUID `json:"inventory_id" gorm:"type:uuid;not null"`
	ExpectedQty    int       `json:"expected_qty" gorm:"not null;default:0"`
	CountedQty     int       `json:"counted_qty" gorm:"not null;default:0"`
	ItemName       string    `json:"item_name,omitempty" gorm:"-"`
}

func (StockTakeLine) TableName() string { return "stock_take_lines" }
func (StockTakeLine) IsTenantScoped()   {}

type PurchaseOrder struct {
	database.Base
	OrganizationID uuid.UUID            `json:"organization_id" gorm:"type:uuid;not null;index"`
	SupplierID     *uuid.UUID           `json:"supplier_id,omitempty" gorm:"type:uuid"`
	SupplierName   string               `json:"supplier_name" gorm:"not null;default:''"`
	Status         string               `json:"status" gorm:"not null;default:draft"`
	Notes          string               `json:"notes"`
	TotalKES       int                  `json:"total_kes" gorm:"not null;default:0"`
	SentAt         *time.Time           `json:"sent_at,omitempty"`
	ReceivedAt     *time.Time           `json:"received_at,omitempty"`
	Lines          []PurchaseOrderLine  `json:"lines,omitempty" gorm:"foreignKey:PurchaseOrderID"`
}

func (PurchaseOrder) TableName() string { return "purchase_orders" }
func (PurchaseOrder) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*PurchaseOrder)(nil)

type PurchaseOrderLine struct {
	ID              uuid.UUID  `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CreatedAt       time.Time  `json:"created_at"`
	OrganizationID  uuid.UUID  `json:"organization_id" gorm:"type:uuid;not null;index"`
	PurchaseOrderID uuid.UUID  `json:"purchase_order_id" gorm:"type:uuid;not null;index"`
	InventoryID     *uuid.UUID `json:"inventory_id,omitempty" gorm:"type:uuid"`
	Name            string     `json:"name" gorm:"not null"`
	Quantity        int        `json:"quantity" gorm:"not null;default:1"`
	UnitCostKES     int        `json:"unit_cost_kes" gorm:"not null;default:0"`
}

func (PurchaseOrderLine) TableName() string { return "purchase_order_lines" }
func (PurchaseOrderLine) IsTenantScoped()   {}

type CreateStockTakeDTO struct {
	Label string `json:"label"`
	Notes string `json:"notes"`
}

type UpdateStockTakeLineDTO struct {
	InventoryID uuid.UUID `json:"inventory_id"`
	CountedQty  int       `json:"counted_qty"`
}

type UpdateStockTakeLinesDTO struct {
	Lines []UpdateStockTakeLineDTO `json:"lines"`
}

type CreatePurchaseOrderDTO struct {
	SupplierID   *uuid.UUID              `json:"supplier_id"`
	SupplierName string                  `json:"supplier_name"`
	Notes        string                  `json:"notes"`
	Lines        []PurchaseOrderLineDTO  `json:"lines"`
}

type PurchaseOrderLineDTO struct {
	InventoryID *uuid.UUID `json:"inventory_id"`
	Name        string     `json:"name"`
	Quantity    int        `json:"quantity"`
	UnitCostKES int        `json:"unit_cost_kes"`
}

type UpdatePurchaseOrderStatusDTO struct {
	Status string `json:"status"`
}

func (s *Service) ListStockTakes(ctx context.Context, orgID uuid.UUID) ([]StockTake, error) {
	return s.repo.ListStockTakes(ctx, orgID)
}

func (s *Service) GetStockTake(ctx context.Context, orgID, id uuid.UUID) (*StockTake, error) {
	row, err := s.repo.GetStockTake(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	items, _ := s.repo.List(ctx, orgID)
	itemNames := map[uuid.UUID]string{}
	for _, it := range items {
		itemNames[it.ID] = it.Name
	}
	for i := range row.Lines {
		row.Lines[i].ItemName = itemNames[row.Lines[i].InventoryID]
	}
	return row, nil
}

func (s *Service) CreateStockTake(ctx context.Context, orgID uuid.UUID, dto CreateStockTakeDTO) (*StockTake, error) {
	items, err := s.repo.List(ctx, orgID)
	if err != nil {
		return nil, err
	}
	label := dto.Label
	if label == "" {
		label = "Stock take " + time.Now().Format("2006-01-02")
	}
	take := &StockTake{
		OrganizationID: orgID,
		Label:          label,
		Status:         "draft",
		Notes:          dto.Notes,
	}
	lines := make([]StockTakeLine, 0, len(items))
	for _, it := range items {
		lines = append(lines, StockTakeLine{
			OrganizationID: orgID,
			InventoryID:    it.ID,
			ExpectedQty:    it.Quantity,
			CountedQty:     it.Quantity,
			ItemName:       it.Name,
		})
	}
	if err := s.repo.CreateStockTake(ctx, take, lines); err != nil {
		return nil, err
	}
	take.Lines = lines
	return take, nil
}

func (s *Service) UpdateStockTakeLines(ctx context.Context, orgID, id uuid.UUID, dto UpdateStockTakeLinesDTO) (*StockTake, error) {
	take, err := s.GetStockTake(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if take.Status != "draft" {
		return nil, httpx.ErrConflict
	}
	for _, line := range dto.Lines {
		if err := s.repo.UpdateStockTakeLineCount(ctx, orgID, id, line.InventoryID, line.CountedQty); err != nil {
			return nil, err
		}
	}
	return s.GetStockTake(ctx, orgID, id)
}

func (s *Service) FinalizeStockTake(ctx context.Context, orgID, id uuid.UUID) (*StockTake, error) {
	take, err := s.GetStockTake(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if take.Status != "draft" {
		return nil, httpx.ErrConflict
	}
	if err := s.repo.FinalizeStockTake(ctx, orgID, take); err != nil {
		return nil, err
	}
	return s.GetStockTake(ctx, orgID, id)
}

func (s *Service) ListPurchaseOrders(ctx context.Context, orgID uuid.UUID) ([]PurchaseOrder, error) {
	return s.repo.ListPurchaseOrders(ctx, orgID)
}

func (s *Service) GetPurchaseOrder(ctx context.Context, orgID, id uuid.UUID) (*PurchaseOrder, error) {
	row, err := s.repo.GetPurchaseOrder(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) CreatePurchaseOrder(ctx context.Context, orgID uuid.UUID, dto CreatePurchaseOrderDTO) (*PurchaseOrder, error) {
	if len(dto.Lines) == 0 {
		return nil, httpx.ErrConflict
	}
	total := 0
	lines := make([]PurchaseOrderLine, 0, len(dto.Lines))
	for _, l := range dto.Lines {
		if l.Name == "" || l.Quantity <= 0 {
			return nil, httpx.ErrConflict
		}
		total += l.Quantity * l.UnitCostKES
		lines = append(lines, PurchaseOrderLine{
			OrganizationID: orgID,
			InventoryID:    l.InventoryID,
			Name:           l.Name,
			Quantity:       l.Quantity,
			UnitCostKES:    l.UnitCostKES,
		})
	}
	po := &PurchaseOrder{
		OrganizationID: orgID,
		SupplierID:     dto.SupplierID,
		SupplierName:   dto.SupplierName,
		Status:         "draft",
		Notes:          dto.Notes,
		TotalKES:       total,
	}
	if err := s.repo.CreatePurchaseOrder(ctx, po, lines); err != nil {
		return nil, err
	}
	po.Lines = lines
	return po, nil
}

func (s *Service) UpdatePurchaseOrderStatus(ctx context.Context, orgID, id uuid.UUID, status string) (*PurchaseOrder, error) {
	po, err := s.GetPurchaseOrder(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	switch status {
	case "sent":
		if po.Status != "draft" {
			return nil, httpx.ErrConflict
		}
		now := time.Now()
		po.Status = "sent"
		po.SentAt = &now
	case "received":
		if po.Status != "sent" {
			return nil, httpx.ErrConflict
		}
		if err := s.repo.ReceivePurchaseOrder(ctx, orgID, po); err != nil {
			return nil, err
		}
		return s.GetPurchaseOrder(ctx, orgID, id)
	default:
		return nil, httpx.ErrConflict
	}
	if err := s.repo.UpdatePurchaseOrder(ctx, orgID, po); err != nil {
		return nil, err
	}
	return po, nil
}
