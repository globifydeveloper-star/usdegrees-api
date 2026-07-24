-- Migration: allow the same college to appear more than once in a report
-- when compared under different programs (usdreport_colleges previously had
-- a hard UNIQUE (report_id, unitid), which rejected any second row for the
-- same unitid regardless of program).
--
-- Run manually (no auto-migration on boot), e.g.:
--   psql "$DATABASE_URL" -f src/db/migrations/report_colleges_program.sql
--
-- Adds cip_code + program_name so the specific compared program is persisted
-- (previously only unitid was saved). Replaces the old unique constraint with
-- one keyed on (report_id, unitid, cip_code) so a college can repeat with a
-- different program, but literal duplicates — same unitid with no program
-- (cip_code NULL) — are still rejected. Postgres UNIQUE treats every NULL as
-- distinct, so a plain UNIQUE(report_id, unitid, cip_code) would silently
-- allow unlimited duplicate (report_id, unitid, NULL) rows; the index below
-- coalesces cip_code to '' so those collide and get caught.

ALTER TABLE usdreport_colleges
  ADD COLUMN IF NOT EXISTS cip_code TEXT,
  ADD COLUMN IF NOT EXISTS program_name TEXT;

ALTER TABLE usdreport_colleges
  DROP CONSTRAINT IF EXISTS usdreport_colleges_report_id_unitid_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usdreport_colleges_report_unitid_program
  ON usdreport_colleges (report_id, unitid, COALESCE(cip_code, ''));
