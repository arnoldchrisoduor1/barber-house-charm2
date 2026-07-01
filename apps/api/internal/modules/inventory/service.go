package inventory

import (
	"context"
	"errors"
	"time"

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

type CreateItemDTO struct {
	Name         string     `json:"name"`
	SKU          string     `json:"sku"`
	Category     string     `json:"category"`
	Quantity     int        `json:"quantity"`
	Unit         string     `json:"unit"`
	UnitCostKES  int        `json:"unit_cost_kes"`
	ReorderLevel int        `json:"reorder_level"`
	Supplier     string     `json:"supplier"`
	SupplierID   *uuid.UUID `json:"supplier_id"`
	BranchID     *uuid.UUID `json:"branch_id"`
}

type UpdateItemDTO struct {
	Name         *string    `json:"name"`
	SKU          *string    `json:"sku"`
	Category     *string    `json:"category"`
	Quantity     *int       `json:"quantity"`
	Unit         *string    `json:"unit"`
	UnitCostKES  *int       `json:"unit_cost_kes"`
	ReorderLevel *int       `json:"reorder_level"`
	Supplier     *string    `json:"supplier"`
	SupplierID   *uuid.UUID `json:"supplier_id"`
	BranchID     *uuid.UUID `json:"branch_id"`
}

func (s *Service) List(ctx context.Context, orgID uuid.UUID) ([]Item, error) {
	return s.repo.List(ctx, orgID)
}

func (s *Service) Get(ctx context.Context, orgID, id uuid.UUID) (*Item, error) {
	row, err := s.repo.Get(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, dto CreateItemDTO) (*Item, error) {
	unit := dto.Unit
	if unit == "" {
		unit = "unit"
	}
	item := &Item{
		OrganizationID: orgID,
		BranchID:       dto.BranchID,
		Name:           dto.Name,
		SKU:            dto.SKU,
		Category:       dto.Category,
		Quantity:       dto.Quantity,
		Unit:           unit,
		UnitCostKES:    dto.UnitCostKES,
		ReorderLevel:   dto.ReorderLevel,
		Supplier:       dto.Supplier,
		SupplierID:     dto.SupplierID,
	}
	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Service) Update(ctx context.Context, orgID, id uuid.UUID, dto UpdateItemDTO) (*Item, error) {
	item, err := s.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.Name != nil {
		item.Name = *dto.Name
	}
	if dto.SKU != nil {
		item.SKU = *dto.SKU
	}
	if dto.Category != nil {
		item.Category = *dto.Category
	}
	if dto.Quantity != nil {
		item.Quantity = *dto.Quantity
	}
	if dto.Unit != nil {
		item.Unit = *dto.Unit
	}
	if dto.UnitCostKES != nil {
		item.UnitCostKES = *dto.UnitCostKES
	}
	if dto.ReorderLevel != nil {
		item.ReorderLevel = *dto.ReorderLevel
	}
	if dto.Supplier != nil {
		item.Supplier = *dto.Supplier
	}
	if dto.SupplierID != nil {
		item.SupplierID = dto.SupplierID
	}
	if dto.BranchID != nil {
		item.BranchID = dto.BranchID
	}
	now := time.Now()
	item.LastRestockedAt = &now
	if err := s.repo.Update(ctx, orgID, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Service) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.Get(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, orgID, id)
}

type CreatePriceLockDTO struct {
	EntityType     string     `json:"entity_type"`
	EntityID       uuid.UUID  `json:"entity_id"`
	LockedPriceKES int        `json:"locked_price_kes"`
	LockedBy       *uuid.UUID `json:"locked_by"`
	Reason         string     `json:"reason"`
	ExpiresAt      *time.Time `json:"expires_at"`
	IsActive       *bool      `json:"is_active"`
}

type UpdatePriceLockDTO struct {
	EntityType     *string    `json:"entity_type"`
	EntityID       *uuid.UUID `json:"entity_id"`
	LockedPriceKES *int       `json:"locked_price_kes"`
	LockedBy       *uuid.UUID `json:"locked_by"`
	Reason         *string    `json:"reason"`
	ExpiresAt      *time.Time `json:"expires_at"`
	IsActive       *bool      `json:"is_active"`
}

func (s *Service) ListPriceLocks(ctx context.Context, orgID uuid.UUID) ([]PriceLock, error) {
	return s.repo.ListPriceLocks(ctx, orgID)
}

func (s *Service) GetPriceLock(ctx context.Context, orgID, id uuid.UUID) (*PriceLock, error) {
	row, err := s.repo.GetPriceLock(ctx, orgID, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, httpx.ErrNotFound
	}
	return row, err
}

func (s *Service) CreatePriceLock(ctx context.Context, orgID uuid.UUID, dto CreatePriceLockDTO) (*PriceLock, error) {
	isActive := true
	if dto.IsActive != nil {
		isActive = *dto.IsActive
	}
	lock := &PriceLock{
		OrganizationID: orgID,
		EntityType:     dto.EntityType,
		EntityID:       dto.EntityID,
		LockedPriceKES: dto.LockedPriceKES,
		LockedBy:       dto.LockedBy,
		Reason:         dto.Reason,
		ExpiresAt:      dto.ExpiresAt,
		IsActive:       isActive,
	}
	if err := s.repo.CreatePriceLock(ctx, lock); err != nil {
		return nil, err
	}
	return lock, nil
}

func (s *Service) UpdatePriceLock(ctx context.Context, orgID, id uuid.UUID, dto UpdatePriceLockDTO) (*PriceLock, error) {
	lock, err := s.GetPriceLock(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if dto.EntityType != nil {
		lock.EntityType = *dto.EntityType
	}
	if dto.EntityID != nil {
		lock.EntityID = *dto.EntityID
	}
	if dto.LockedPriceKES != nil {
		lock.LockedPriceKES = *dto.LockedPriceKES
	}
	if dto.LockedBy != nil {
		lock.LockedBy = dto.LockedBy
	}
	if dto.Reason != nil {
		lock.Reason = *dto.Reason
	}
	if dto.ExpiresAt != nil {
		lock.ExpiresAt = dto.ExpiresAt
	}
	if dto.IsActive != nil {
		lock.IsActive = *dto.IsActive
	}
	if err := s.repo.UpdatePriceLock(ctx, orgID, lock); err != nil {
		return nil, err
	}
	return lock, nil
}

func (s *Service) DeletePriceLock(ctx context.Context, orgID, id uuid.UUID) error {
	if _, err := s.GetPriceLock(ctx, orgID, id); err != nil {
		return err
	}
	return s.repo.DeletePriceLock(ctx, orgID, id)
}
