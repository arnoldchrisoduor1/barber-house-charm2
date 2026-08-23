DROP TABLE IF EXISTS field_jobs;

ALTER TABLE bookings
  DROP COLUMN IF EXISTS coverage_zone_id,
  DROP COLUMN IF EXISTS visit_address;
