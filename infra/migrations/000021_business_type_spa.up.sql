-- Spa was omitted from the original business_type enum; contracts/nav/seeds all use it.
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'spa';
