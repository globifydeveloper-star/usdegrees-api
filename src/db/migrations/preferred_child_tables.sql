-- Migration: preferred states/programs live in CHILD TABLES (one row per value),
-- not as array columns on usdusers. Creates the tables if absent, enforces
-- uniqueness, migrates any existing array-column data, then drops the columns.
-- Idempotent — safe to re-run.
--
-- Run manually (no auto-migration on boot):
--   psql "$DATABASE_URL" -f src/db/migrations/preferred_child_tables.sql

-- 1. Tables (user_id FKs to usdusers.id, the integer PK).
CREATE TABLE IF NOT EXISTS usdusers_preferred_states (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES usdusers(id) ON DELETE CASCADE,
  state_code TEXT   NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usdusers_preferred_programs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES usdusers(id) ON DELETE CASCADE,
  program    TEXT   NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. One row per (user, value).
CREATE UNIQUE INDEX IF NOT EXISTS uq_pref_states_user_code
  ON usdusers_preferred_states (user_id, state_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pref_programs_user_program
  ON usdusers_preferred_programs (user_id, program);

-- 3. Migrate existing array-column data (only if the columns still exist).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name='usdusers' AND column_name='preferred_states') THEN
    INSERT INTO usdusers_preferred_states (user_id, state_code)
    SELECT id, unnest(preferred_states) FROM usdusers WHERE preferred_states IS NOT NULL
    ON CONFLICT (user_id, state_code) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name='usdusers' AND column_name='preferred_programs') THEN
    INSERT INTO usdusers_preferred_programs (user_id, program)
    SELECT id, unnest(preferred_programs) FROM usdusers WHERE preferred_programs IS NOT NULL
    ON CONFLICT (user_id, program) DO NOTHING;
  END IF;
END $$;

-- 4. Drop the now-unused array columns. (preferred_degree_level stays a column.)
ALTER TABLE usdusers DROP COLUMN IF EXISTS preferred_states;
ALTER TABLE usdusers DROP COLUMN IF EXISTS preferred_programs;
