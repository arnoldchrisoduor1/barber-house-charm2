DROP INDEX IF EXISTS idx_transactions_booking;
ALTER TABLE transactions DROP COLUMN IF EXISTS booking_id;
