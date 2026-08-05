-- Phase 2 money loop: payment intents (server-computed amounts), immutable commission
-- lines, day cash-up reconciliation, and staff attribution on POS transactions.

-- B2-01: server-side record of what an order was created for, so IPN/status checks
-- never trust a client- or provider-supplied amount as authoritative.
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  merchant_reference text NOT NULL,
  order_tracking_id text,
  amount_kes bigint NOT NULL CHECK (amount_kes > 0),
  currency text NOT NULL DEFAULT 'KES',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_merchant_ref ON payment_intents(organization_id, merchant_reference);
CREATE INDEX IF NOT EXISTS idx_payment_intents_org ON payment_intents(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_tracking ON payment_intents(order_tracking_id);

-- B2-03: which barber a POS sale belongs to (existing analytics/commission SQL already
-- assumed this column; it never existed, silently breaking commission + leaderboard queries).
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_staff ON transactions(staff_id);

-- B2-03: immutable per-ticket commission line. Period totals are SUM(amount_kes); manual
-- corrections are a reversing 'adjustment' line, never an edit of a 'service' line.
CREATE TABLE IF NOT EXISTS commission_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'service' CHECK (kind IN ('service', 'adjustment')),
  base_kes bigint NOT NULL DEFAULT 0,
  rate_pct numeric(5,2) NOT NULL DEFAULT 0,
  amount_kes bigint NOT NULL,
  reversed_line_id uuid REFERENCES commission_lines(id) ON DELETE SET NULL,
  note text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- One immutable service line per completed sale; prevents double-completion double-counting.
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_lines_tx_service
  ON commission_lines(transaction_id)
  WHERE kind = 'service' AND transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commission_lines_org_staff ON commission_lines(organization_id, staff_id, created_at);

-- B2-06: day cash-up. Expected = system-computed totals for the period; counted = what
-- the till actually held. Variance is always computed server-side, never entered directly.
CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_cash_kes bigint NOT NULL DEFAULT 0,
  expected_card_kes bigint NOT NULL DEFAULT 0,
  counted_cash_kes bigint,
  counted_card_kes bigint,
  variance_kes bigint,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes text,
  closed_by_user_id uuid,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_org_date ON reconciliation_runs(organization_id, run_date);
