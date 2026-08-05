ALTER TABLE enquiries DROP COLUMN IF EXISTS updated_at;
ALTER TABLE enquiries DROP COLUMN IF EXISTS converted_booking_id;
ALTER TABLE enquiries DROP COLUMN IF EXISTS customer_id;
ALTER TABLE enquiries DROP COLUMN IF EXISTS status;
ALTER TABLE enquiries DROP COLUMN IF EXISTS source;

DROP TABLE IF EXISTS purchase_order_lines;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS stock_take_lines;
DROP TABLE IF EXISTS stock_takes;
