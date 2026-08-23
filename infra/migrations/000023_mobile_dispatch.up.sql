-- Mobile dispatch parity: home-visit fields on bookings + field_jobs table.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS visit_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS coverage_zone_id uuid REFERENCES coverage_zones(id);

CREATE INDEX IF NOT EXISTS idx_bookings_coverage_zone ON bookings(coverage_zone_id);

CREATE TABLE IF NOT EXISTS field_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  coverage_zone_id uuid REFERENCES coverage_zones(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'en_route', 'on_site', 'done', 'cancelled')),
  visit_address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_field_jobs_org ON field_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_field_jobs_org_status ON field_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_field_jobs_staff ON field_jobs(staff_id);
CREATE INDEX IF NOT EXISTS idx_field_jobs_booking ON field_jobs(booking_id);
