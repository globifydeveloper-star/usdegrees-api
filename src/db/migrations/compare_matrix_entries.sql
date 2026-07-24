-- Migration: compare_matrix_entries — persists the /compare page's
-- per-program selections (unitid + specific program), separate from the
-- existing bare-unitid user_compare_history bucket backing /compare/selected
-- (which stays untouched — still used by search cards/nav badge).
--
-- Run manually (no auto-migration on boot), e.g.:
--   psql "$DATABASE_URL" -f src/db/migrations/compare_matrix_entries.sql
--
-- One row per (user, college, program) the family has added to the compare
-- matrix. cip_code/credential_level nullable — a college can be added with
-- no specific program picked yet. This table is fully replaced on every
-- PUT /compare/matrix (delete-then-insert in one transaction), so the
-- frontend — not this constraint — is what keeps the list de-duplicated;
-- the UNIQUE constraint below is a backstop against a bad payload.

CREATE TABLE IF NOT EXISTS compare_matrix_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES usdusers(id) ON DELETE CASCADE,
  unitid BIGINT NOT NULL,
  cip_code TEXT,
  credential_level TEXT,
  program_name TEXT,
  credential_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, unitid, cip_code, credential_level)
);

CREATE INDEX IF NOT EXISTS idx_compare_matrix_entries_user_id
  ON compare_matrix_entries (user_id);
