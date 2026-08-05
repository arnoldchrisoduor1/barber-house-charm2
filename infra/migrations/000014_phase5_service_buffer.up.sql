-- Phase 5 B5-02: service prep/buffer minutes for slot padding.

ALTER TABLE services ADD COLUMN IF NOT EXISTS prep_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 0;
