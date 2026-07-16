-- athletic_division_benchmarks.sql
-- Run once on your PostgreSQL instance, then keep the table fresh by
-- running `npm run refresh:athletic-benchmarks` whenever EADA data is
-- re-imported (typically annually).
--
-- Precomputed per-division/survey_year averages so the athletics profile
-- endpoint never has to scan all athletic_summary rows on a page load.

CREATE TABLE IF NOT EXISTS athletic_division_benchmarks (
  division                text NOT NULL,
  survey_year             text NOT NULL,
  avg_athletes_total      numeric,
  avg_aid_per_athlete     numeric,
  avg_recruiting_expense  numeric,
  avg_revenue             numeric,
  avg_expense             numeric,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (division, survey_year)
);
