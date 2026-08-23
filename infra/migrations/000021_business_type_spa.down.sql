-- Postgres cannot easily DROP enum values; leave as no-op.
-- Manual rollback would require recreating the type without 'spa' and rewriting columns.
SELECT 1;
