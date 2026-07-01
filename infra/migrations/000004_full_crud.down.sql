-- Reverse 000004_full_crud

DROP TABLE IF EXISTS user_two_factor;
DROP TABLE IF EXISTS price_locks;
DROP TABLE IF EXISTS gallery_items;
DROP TABLE IF EXISTS seat_rentals;
DROP TABLE IF EXISTS org_branding;
DROP TABLE IF EXISTS staff_chat_messages;
DROP TABLE IF EXISTS enquiries;
DROP TABLE IF EXISTS notification_settings;
DROP TABLE IF EXISTS consent_forms;
DROP TABLE IF EXISTS marketing_campaigns;
DROP TABLE IF EXISTS customer_packages;
DROP TABLE IF EXISTS service_packages;
DROP TABLE IF EXISTS gift_card_redemptions;
DROP TABLE IF EXISTS gift_cards;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS consumption_logs;
DROP TABLE IF EXISTS retail_products;

ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_supplier_id_fkey;
ALTER TABLE inventory DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE inventory DROP COLUMN IF EXISTS sku;

DROP TABLE IF EXISTS suppliers;

DROP INDEX IF EXISTS idx_customers_assigned_staff;
ALTER TABLE customers
  DROP COLUMN IF EXISTS assigned_staff_id,
  DROP COLUMN IF EXISTS branch_id,
  DROP COLUMN IF EXISTS last_visit_at,
  DROP COLUMN IF EXISTS loyalty_points,
  DROP COLUMN IF EXISTS total_spent,
  DROP COLUMN IF EXISTS total_visits,
  DROP COLUMN IF EXISTS loyalty_tier,
  DROP COLUMN IF EXISTS style_preferences;

ALTER TABLE staff
  DROP COLUMN IF EXISTS commission_rate,
  DROP COLUMN IF EXISTS specialties,
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS email;

ALTER TABLE notifications
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS type;

DROP TYPE IF EXISTS loyalty_tier;
