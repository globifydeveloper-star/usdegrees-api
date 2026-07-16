-- Migration: add age_consent flag captured at signup.
-- Idempotent — safe to re-run.
--
-- Run manually (no auto-migration on boot), e.g.:
--   psql "$DATABASE_URL" -f src/db/migrations/age_consent.sql

ALTER TABLE usdusers
  ADD COLUMN IF NOT EXISTS age_consent BOOLEAN NOT NULL DEFAULT FALSE;
