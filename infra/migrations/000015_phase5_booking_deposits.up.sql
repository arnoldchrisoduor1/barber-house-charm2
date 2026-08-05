-- B5-01 booking deposits + cancellation policy.

CREATE TABLE IF NOT EXISTS organization_booking_policies (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  deposits_enabled boolean NOT NULL DEFAULT false,
  deposit_type text NOT NULL DEFAULT 'percent' CHECK (deposit_type IN ('percent', 'fixed')),
  deposit_amount integer NOT NULL DEFAULT 25 CHECK (deposit_amount >= 0),
  refund_window_hours integer NOT NULL DEFAULT 24 CHECK (refund_window_hours >= 0),
  late_cancel_fee_kes bigint NOT NULL DEFAULT 0 CHECK (late_cancel_fee_kes >= 0),
  late_cancel_hours integer NOT NULL DEFAULT 24 CHECK (late_cancel_hours >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount_kes bigint NOT NULL CHECK (amount_kes > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'forfeited')),
  payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);
CREATE INDEX IF NOT EXISTS idx_booking_deposits_org ON booking_deposits(organization_id, created_at DESC);
