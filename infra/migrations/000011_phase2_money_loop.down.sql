DROP TABLE IF EXISTS reconciliation_runs;
DROP TABLE IF EXISTS commission_lines;
ALTER TABLE transactions DROP COLUMN IF EXISTS staff_id;
DROP TABLE IF EXISTS payment_intents;
