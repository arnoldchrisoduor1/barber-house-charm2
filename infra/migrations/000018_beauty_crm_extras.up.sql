ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS allergy_notes text,
  ADD COLUMN IF NOT EXISTS has_allergies boolean NOT NULL DEFAULT false;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS requires_patch_test boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS customer_patch_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  test_type text NOT NULL DEFAULT 'colour',
  performed_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_patch_tests_org ON customer_patch_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_patch_tests_customer ON customer_patch_tests(customer_id);

CREATE TABLE IF NOT EXISTS client_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  service_name text,
  treatment_summary text,
  skin_notes text,
  product_used text,
  next_appointment_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_consultations_org ON client_consultations(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_consultations_customer ON client_consultations(customer_id);
