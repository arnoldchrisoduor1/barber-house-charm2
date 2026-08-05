DROP TABLE IF EXISTS client_consultations;
DROP TABLE IF EXISTS customer_patch_tests;

ALTER TABLE services DROP COLUMN IF EXISTS requires_patch_test;

ALTER TABLE customers
  DROP COLUMN IF EXISTS has_allergies,
  DROP COLUMN IF EXISTS allergy_notes;
