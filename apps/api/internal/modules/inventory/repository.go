package inventory

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	platformtenancy "github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, orgID uuid.UUID) ([]Item, error) {
	var rows []Item
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("name ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) Get(ctx context.Context, orgID, id uuid.UUID) (*Item, error) {
	var row Item
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) Create(ctx context.Context, item *Item) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *Repository) Update(ctx context.Context, orgID uuid.UUID, item *Item) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(item).Error
}

func (r *Repository) Delete(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&Item{}, "id = ?", id).Error
}

func (r *Repository) ListPriceLocks(ctx context.Context, orgID uuid.UUID) ([]PriceLock, error) {
	var rows []PriceLock
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetPriceLock(ctx context.Context, orgID, id uuid.UUID) (*PriceLock, error) {
	var row PriceLock
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreatePriceLock(ctx context.Context, lock *PriceLock) error {
	return r.db.WithContext(ctx).Create(lock).Error
}

func (r *Repository) UpdatePriceLock(ctx context.Context, orgID uuid.UUID, lock *PriceLock) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(lock).Error
}

func (r *Repository) DeletePriceLock(ctx context.Context, orgID, id uuid.UUID) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Delete(&PriceLock{}, "id = ?", id).Error
}

func (r *Repository) ListStockTakes(ctx context.Context, orgID uuid.UUID) ([]StockTake, error) {
	var rows []StockTake
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetStockTake(ctx context.Context, orgID, id uuid.UUID) (*StockTake, error) {
	var row StockTake
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Preload("Lines", func(db *gorm.DB) *gorm.DB {
			return db.Scopes(platformtenancy.OrgScope(orgID))
		}).
		First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreateStockTake(ctx context.Context, take *StockTake, lines []StockTakeLine) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(take).Error; err != nil {
			return err
		}
		for i := range lines {
			lines[i].StockTakeID = take.ID
			lines[i].OrganizationID = take.OrganizationID
		}
		if len(lines) > 0 {
			if err := tx.Create(&lines).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *Repository) UpdateStockTakeLineCount(ctx context.Context, orgID, takeID, inventoryID uuid.UUID, counted int) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Model(&StockTakeLine{}).
		Where("stock_take_id = ? AND inventory_id = ?", takeID, inventoryID).
		Update("counted_qty", counted).Error
}

func (r *Repository) FinalizeStockTake(ctx context.Context, orgID uuid.UUID, take *StockTake) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, line := range take.Lines {
			if line.CountedQty == line.ExpectedQty {
				continue
			}
			if err := tx.Scopes(platformtenancy.OrgScope(orgID)).
				Model(&Item{}).
				Where("id = ?", line.InventoryID).
				Updates(map[string]any{
					"quantity":          line.CountedQty,
					"last_restocked_at": gorm.Expr("now()"),
					"updated_at":        gorm.Expr("now()"),
				}).Error; err != nil {
				return err
			}
		}
		now := time.Now()
		take.Status = "finalized"
		take.FinalizedAt = &now
		return tx.Scopes(platformtenancy.OrgScope(orgID)).Save(take).Error
	})
}

func (r *Repository) ListPurchaseOrders(ctx context.Context, orgID uuid.UUID) ([]PurchaseOrder, error) {
	var rows []PurchaseOrder
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Order("created_at DESC").Find(&rows).Error
	return rows, err
}

func (r *Repository) GetPurchaseOrder(ctx context.Context, orgID, id uuid.UUID) (*PurchaseOrder, error) {
	var row PurchaseOrder
	err := r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).
		Preload("Lines", func(db *gorm.DB) *gorm.DB {
			return db.Scopes(platformtenancy.OrgScope(orgID))
		}).
		First(&row, "id = ?", id).Error
	return &row, err
}

func (r *Repository) CreatePurchaseOrder(ctx context.Context, po *PurchaseOrder, lines []PurchaseOrderLine) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(po).Error; err != nil {
			return err
		}
		for i := range lines {
			lines[i].PurchaseOrderID = po.ID
			lines[i].OrganizationID = po.OrganizationID
		}
		if len(lines) > 0 {
			if err := tx.Create(&lines).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *Repository) UpdatePurchaseOrder(ctx context.Context, orgID uuid.UUID, po *PurchaseOrder) error {
	return r.db.WithContext(ctx).Scopes(platformtenancy.OrgScope(orgID)).Save(po).Error
}

func (r *Repository) ReceivePurchaseOrder(ctx context.Context, orgID uuid.UUID, po *PurchaseOrder) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, line := range po.Lines {
			if line.InventoryID == nil {
				continue
			}
			if err := tx.Scopes(platformtenancy.OrgScope(orgID)).
				Model(&Item{}).
				Where("id = ?", *line.InventoryID).
				Updates(map[string]any{
					"quantity":          gorm.Expr("quantity + ?", line.Quantity),
					"last_restocked_at": gorm.Expr("now()"),
					"updated_at":        gorm.Expr("now()"),
				}).Error; err != nil {
				return err
			}
		}
		now := time.Now()
		po.Status = "received"
		po.ReceivedAt = &now
		return tx.Scopes(platformtenancy.OrgScope(orgID)).Save(po).Error
	})
}
