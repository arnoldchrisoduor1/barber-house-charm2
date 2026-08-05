ALTER TABLE organizations
  DROP COLUMN IF EXISTS chair_count,
  DROP COLUMN IF EXISTS monthly_revenue_target_kes;
