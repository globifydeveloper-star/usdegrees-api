-- Migration: ensure a single save per (user_id, unitid) on the EXISTING
-- user_saved_colleges table. A unique index is idempotent (IF NOT EXISTS) and
-- supports INSERT ... ON CONFLICT (user_id, unitid) DO NOTHING.
--
-- Run manually (no auto-migration on boot), e.g.:
--   psql "$DATABASE_URL" -f src/db/migrations/saved_colleges_unique.sql
--
-- Does not alter or drop existing columns.

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_saved_colleges_user_unitid
  ON user_saved_colleges (user_id, unitid);
