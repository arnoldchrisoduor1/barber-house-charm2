DROP TABLE IF EXISTS customer_photos;
DROP TABLE IF EXISTS customer_tag_links;
DROP TABLE IF EXISTS customer_tags;
ALTER TABLE customers DROP COLUMN IF EXISTS merged_into_id;
DROP TABLE IF EXISTS pos_tab_items;
DROP TABLE IF EXISTS pos_tabs;
DROP TABLE IF EXISTS organization_pos_settings;
