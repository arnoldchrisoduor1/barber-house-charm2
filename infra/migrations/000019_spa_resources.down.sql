DROP TABLE IF EXISTS session_notes;
ALTER TABLE bookings DROP COLUMN IF EXISTS resource_id;
DROP TABLE IF EXISTS resources;
DROP TYPE IF EXISTS resource_status;
DROP TYPE IF EXISTS resource_type;
