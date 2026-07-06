-- Migration: consolidate the two SAT sub-score columns into a single total.
--
-- The web app now sends/expects a single total SAT score (sat_score, an integer
-- in 400..1600) instead of the separate sat_reading_writing + sat_math columns.
-- This adds the new column and backfills it from the old pair where both are
-- present. The old columns are intentionally kept for now: the frontend still
-- reads them as a temporary fallback. Drop them (see the commented block at the
-- bottom) once the backfill and the frontend cutover are verified.
--
-- Idempotent — safe to re-run.
--
-- Run manually (no auto-migration on boot), e.g.:
--   psql "$DATABASE_URL" -f src/db/migrations/sat_score_total.sql

-- 1. Add the new nullable total column, constrained to the valid SAT range.
ALTER TABLE usdusers
  ADD COLUMN IF NOT EXISTS sat_score INTEGER;

-- Guard the range. A separate ADD CONSTRAINT is used (rather than an inline
-- CHECK on ADD COLUMN) so this stays idempotent across re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usdusers_sat_score_range'
  ) THEN
    ALTER TABLE usdusers
      ADD CONSTRAINT usdusers_sat_score_range
      CHECK (sat_score IS NULL OR sat_score BETWEEN 400 AND 1600);
  END IF;
END $$;

-- 2. Backfill from the old pair where BOTH sub-scores are present and the sum
-- is a valid total. Only touch rows not already populated, so re-runs are safe.
UPDATE usdusers
   SET sat_score = sat_reading_writing + sat_math
 WHERE sat_score IS NULL
   AND sat_reading_writing IS NOT NULL
   AND sat_math IS NOT NULL
   AND (sat_reading_writing + sat_math) BETWEEN 400 AND 1600;

-- 3. AFTER the backfill and frontend cutover are verified, drop the old columns:
-- ALTER TABLE usdusers
--   DROP COLUMN IF EXISTS sat_reading_writing,
--   DROP COLUMN IF EXISTS sat_math;
