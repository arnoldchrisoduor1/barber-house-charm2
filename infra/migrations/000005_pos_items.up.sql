CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    item_id UUID NOT NULL,
    name TEXT NOT NULL,
    unit_price_kes INT NOT NULL CHECK (unit_price_kes >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total_kes INT NOT NULL CHECK (line_total_kes >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transaction_items_tx ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_org ON transaction_items(organization_id);
