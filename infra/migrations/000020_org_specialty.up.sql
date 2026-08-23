-- Org specialty (solo_pro trade + mobile dispatch overlay; Phase 0 design, Phase 3 mobile wiring)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS specialty business_type;

COMMENT ON COLUMN organizations.specialty IS 'Solo-pro trade or mobile service specialty; terms/catalog overlay when business_type is solo_pro or mobile';
