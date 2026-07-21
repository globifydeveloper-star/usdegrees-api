-- indexes.sql
-- Run once on your PostgreSQL instance.
-- These back all three school-programs APIs.

-- ─────────────────────────────────────────────────────────────────
-- programs table
-- ─────────────────────────────────────────────────────────────────

-- Already exists (from your schema), confirming:
--   idx_programs_unitid         btree (unitid)
--   idx_programs_cip_credential btree (cip_code, credential_level)
--   idx_programs_title_trgm     gin   (title gin_trgm_ops)

-- Composite index for autocomplete: unitid + title (covers both filter + sort)
CREATE INDEX IF NOT EXISTS idx_programs_unitid_title
  ON programs (unitid, title);

-- Composite index for degreeLevels: unitid + lower(title) + credential columns
-- Allows index-only scan for the degrees query
CREATE INDEX IF NOT EXISTS idx_programs_unitid_lower_title
  ON programs (unitid, lower(title), credential_level, credential_title);

-- ─────────────────────────────────────────────────────────────────
-- earnings_against_courses table (LEGACY — kept for rollback only;
-- earnings_against_courses_merged is the source of truth as of the
-- earnings-data cutover. Do not drop this index or the table yet.)
-- ─────────────────────────────────────────────────────────────────

-- Already exists: idx_eac_unitid, idx_eac_cip, idx_eac_credential
-- Add composite for LATERAL join (unitid + cip_code + credential_level + grad_cohort DESC)
CREATE INDEX IF NOT EXISTS idx_eac_lateral_lookup
  ON earnings_against_courses (unitid, cip_code, credential_level, grad_cohort DESC);

-- ─────────────────────────────────────────────────────────────────
-- earnings_against_courses_merged table (current source of truth)
-- ─────────────────────────────────────────────────────────────────

-- Already exists in the DB: idx_eac_merged_unitid_cip (unitid, cip_code)
--                            idx_eac_merged_lateral_lookup (unitid, cip_code, credential_level, grad_cohort DESC)
-- No action needed — confirmed via information_schema during the cutover.

-- ─────────────────────────────────────────────────────────────────
-- admissions / completion (already have PKs on unitid — no extra needed)
-- ─────────────────────────────────────────────────────────────────