-- Migration: supporting indexes for compare-selection reads on the EXISTING
-- user_compare_history table. Idempotent, non-breaking, no column changes.
--
-- Run manually (no auto-migration on boot):
--   psql "$DATABASE_URL" -f src/db/migrations/compare_history_indexes.sql
--
-- NOTE: idx_user_compare_history_user_created ON (user_id, created_at DESC)
-- already exists and serves the "latest row = current set" lookup. The GIN
-- index below speeds up membership/containment scans on the jsonb set
-- (e.g. compared_colleges @> '[222178]') for per-unitid history queries.

CREATE INDEX IF NOT EXISTS idx_user_compare_history_colleges_gin
  ON user_compare_history USING GIN (compared_colleges jsonb_path_ops);
