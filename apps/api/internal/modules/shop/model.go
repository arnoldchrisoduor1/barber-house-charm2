package shop

import (
	"time"

	"github.com/google/uuid"

	"github.com/haus-of-wellness/api/internal/platform/database"
	"github.com/haus-of-wellness/api/internal/platform/tenancy"
)

type Order struct {
	database.Base
	OrganizationID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"organization_id"`
	BranchID         *uuid.UUID `gorm:"type:uuid" json:"branch_id,omitempty"`
	OrderNumber      string     `gorm:"not null" json:"order_number"`
	Status           string     `gorm:"not null;default:pending" json:"status"`
	FulfillmentType  string     `gorm:"not null;default:pickup" json:"fulfillment_type"`
	PaymentMethod    string     `gorm:"not null;default:pay_on_pickup" json:"payment_method"`
	CustomerName     string     `gorm:"not null;default:''" json:"customer_name"`
	CustomerPhone    string     `gorm:"not null;default:''" json:"customer_phone"`
	CustomerEmail    string     `gorm:"not null;default:''" json:"customer_email"`
	DeliveryAddress  string     `gorm:"not null;default:''" json:"delivery_address"`
	Notes            string     `gorm:"not null;default:''" json:"notes"`
	SubtotalKES      int        `gorm:"not null;default:0" json:"subtotal_kes"`
	TotalKES         int        `gorm:"not null;default:0" json:"total_kes"`
	StockDecremented bool       `gorm:"not null;default:false" json:"stock_decremented"`
	FulfilledAt      *time.Time `json:"fulfilled_at,omitempty"`
	CancelledAt      *time.Time `json:"cancelled_at,omitempty"`
	Items            []OrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
}

func (Order) TableName() string { return "shop_orders" }
func (Order) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*Order)(nil)

type OrderItem struct {
	database.Base
	OrganizationID uuid.UUID  `gorm:"type:uuid;not null;index" json:"organization_id"`
	OrderID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"order_id"`
	ProductID      *uuid.UUID `gorm:"type:uuid" json:"product_id,omitempty"`
	ProductName    string     `gorm:"not null" json:"product_name"`
	SKU            string     `gorm:"not null;default:''" json:"sku"`
	UnitPriceKES   int        `gorm:"not null;default:0" json:"unit_price_kes"`
	Quantity       int        `gorm:"not null;default:1" json:"quantity"`
	LineTotalKES   int        `gorm:"not null;default:0" json:"line_total_kes"`
}

func (OrderItem) TableName() string { return "shop_order_items" }
func (OrderItem) IsTenantScoped()   {}

var _ tenancy.OrgScoped = (*OrderItem)(nil)
