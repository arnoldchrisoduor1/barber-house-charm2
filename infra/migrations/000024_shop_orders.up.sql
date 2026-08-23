-- Shop orders commerce loop.

CREATE TABLE IF NOT EXISTS shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'fulfilled', 'cancelled')),
  fulfillment_type text NOT NULL DEFAULT 'pickup'
    CHECK (fulfillment_type IN ('pickup', 'delivery')),
  payment_method text NOT NULL DEFAULT 'pay_on_pickup',
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  delivery_address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  subtotal_kes integer NOT NULL DEFAULT 0,
  total_kes integer NOT NULL DEFAULT 0,
  stock_decremented boolean NOT NULL DEFAULT false,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_org ON shop_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_org_status ON shop_orders(organization_id, status);

CREATE TABLE IF NOT EXISTS shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES retail_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text NOT NULL DEFAULT '',
  unit_price_kes integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total_kes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_org ON shop_order_items(organization_id);
