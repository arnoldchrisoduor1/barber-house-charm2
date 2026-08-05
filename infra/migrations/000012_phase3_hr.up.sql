-- Phase 3 HR depth: time-off, payslip days worked, chair rent charges.

CREATE TABLE IF NOT EXISTS time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_time_off_org_staff ON time_off_requests(organization_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_time_off_dates ON time_off_requests(organization_id, staff_id, start_date, end_date);

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS days_worked integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS seat_rent_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  seat_rental_id uuid NOT NULL REFERENCES seat_rentals(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  period_month date NOT NULL,
  amount_kes bigint NOT NULL CHECK (amount_kes > 0),
  ledger_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seat_rent_charges_unique
  ON seat_rent_charges(seat_rental_id, period_month);
