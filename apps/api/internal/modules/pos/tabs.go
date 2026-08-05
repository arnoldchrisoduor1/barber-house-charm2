package pos

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/httpx"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type PosTab struct {
	database.Base
	OrganizationID uuid.UUID  `json:"organization_id" gorm:"type:uuid;not null;index"`
	BranchID       *uuid.UUID `json:"branch_id,omitempty" gorm:"type:uuid"`
	CustomerID     *uuid.UUID `json:"customer_id,omitempty" gorm:"type:uuid"`
	Label          string     `json:"label" gorm:"not null"`
	Status         string     `json:"status" gorm:"not null;default:open"`
	Items          []PosTabItem `json:"items,omitempty" gorm:"foreignKey:TabID"`
}

func (PosTab) TableName() string { return "pos_tabs" }
func (PosTab) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*PosTab)(nil)

type PosTabItem struct {
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CreatedAt      time.Time  `json:"created_at"`
	OrganizationID uuid.UUID  `json:"organization_id" gorm:"type:uuid;not null;index"`
	TabID          uuid.UUID  `json:"tab_id" gorm:"type:uuid;not null;index"`
	ItemType       string     `json:"item_type" gorm:"not null;default:custom"`
	ItemID         *uuid.UUID `json:"item_id,omitempty" gorm:"type:uuid"`
	Name           string     `json:"name" gorm:"not null"`
	UnitPriceKES   int        `json:"unit_price_kes" gorm:"not null"`
	Quantity       int        `json:"quantity" gorm:"not null;default:1"`
}

func (PosTabItem) TableName() string { return "pos_tab_items" }
func (PosTabItem) IsTenantScoped()   {}

type OpenTabDTO struct {
	Label      string     `json:"label"`
	CustomerID *uuid.UUID `json:"customer_id"`
	BranchID   *uuid.UUID `json:"branch_id"`
}

type AddTabItemDTO struct {
	ItemType     string     `json:"item_type"`
	ItemID       *uuid.UUID `json:"item_id"`
	Name         string     `json:"name"`
	UnitPriceKES int        `json:"unit_price_kes"`
	Quantity     int        `json:"quantity"`
}

func (s *Service) ListTabs(ctx context.Context, orgID uuid.UUID, status string) ([]PosTab, error) {
	return s.repo.ListTabs(ctx, orgID, status)
}

func (s *Service) OpenTab(ctx context.Context, orgID uuid.UUID, dto OpenTabDTO) (*PosTab, error) {
	if dto.Label == "" {
		return nil, httpx.ErrConflict
	}
	tab := &PosTab{
		OrganizationID: orgID,
		BranchID:       dto.BranchID,
		CustomerID:     dto.CustomerID,
		Label:          dto.Label,
		Status:         "open",
	}
	if err := s.repo.CreateTab(ctx, tab); err != nil {
		return nil, err
	}
	return tab, nil
}

func (s *Service) AddTabItem(ctx context.Context, orgID, tabID uuid.UUID, dto AddTabItemDTO) (*PosTabItem, error) {
	if dto.Name == "" || dto.UnitPriceKES < 0 || dto.Quantity <= 0 {
		return nil, httpx.ErrConflict
	}
	if _, err := s.repo.GetTab(ctx, orgID, tabID); err != nil {
		return nil, httpx.ErrNotFound
	}
	item := &PosTabItem{
		OrganizationID: orgID,
		TabID:          tabID,
		ItemType:       dto.ItemType,
		ItemID:         dto.ItemID,
		Name:           dto.Name,
		UnitPriceKES:   dto.UnitPriceKES,
		Quantity:       dto.Quantity,
	}
	if item.ItemType == "" {
		item.ItemType = "custom"
	}
	if err := s.repo.CreateTabItem(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Service) CloseTab(ctx context.Context, orgID, tabID uuid.UUID) (*PosTab, error) {
	tab, err := s.repo.GetTab(ctx, orgID, tabID)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	tab.Status = "closed"
	if err := s.repo.UpdateTab(ctx, orgID, tab); err != nil {
		return nil, err
	}
	return tab, nil
}
