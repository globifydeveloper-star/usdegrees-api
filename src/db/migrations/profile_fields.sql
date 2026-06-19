-- Migration: add the extended profile fields that PATCH /profile maps.
-- All columns are nullable with no defaults (a field the user leaves blank
-- stores NULL, not a placeholder). Idempotent — safe to re-run.
--
-- Run manually (no auto-migration on boot), e.g.:
--   psql "$DATABASE_URL" -f src/db/migrations/profile_fields.sql

ALTER TABLE usdusers
  ADD COLUMN IF NOT EXISTS phone                  TEXT,
  ADD COLUMN IF NOT EXISTS address                TEXT,
  ADD COLUMN IF NOT EXISTS gpa                    NUMERIC(3,2),   -- e.g. 3.80
  ADD COLUMN IF NOT EXISTS sat_math               INTEGER,
  ADD COLUMN IF NOT EXISTS sat_reading_writing    INTEGER,
  ADD COLUMN IF NOT EXISTS act_score              INTEGER,
  ADD COLUMN IF NOT EXISTS graduation_year        INTEGER,
  ADD COLUMN IF NOT EXISTS high_school_name       TEXT,
  ADD COLUMN IF NOT EXISTS preferred_degree_level TEXT,
  ADD COLUMN IF NOT EXISTS preferred_programs     TEXT[],         -- array of program names
  ADD COLUMN IF NOT EXISTS preferred_states       TEXT[];         -- array of state codes
