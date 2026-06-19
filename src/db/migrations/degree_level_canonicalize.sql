-- Migration: canonicalize legacy preferred_degree_level short forms in usdusers
-- to the 8 canonical strings (see src/constants/degreeLevels.ts).
-- Idempotent — safe to re-run; only touches non-canonical legacy values.
--
-- Run manually (no auto-migration on boot), e.g.:
--   psql "$DATABASE_URL" -f src/db/migrations/degree_level_canonicalize.sql

UPDATE usdusers SET preferred_degree_level = 'Bachelor''s Degree'
  WHERE preferred_degree_level IN ('Bachelor''s', 'Bachelors');

UPDATE usdusers SET preferred_degree_level = 'Associate''s Degree'
  WHERE preferred_degree_level IN ('Associate''s', 'Associates');

UPDATE usdusers SET preferred_degree_level = 'Master''s Degree'
  WHERE preferred_degree_level IN ('Master''s', 'Masters');

UPDATE usdusers SET preferred_degree_level = 'Doctoral Degree'
  WHERE preferred_degree_level IN ('Doctoral', 'Doctorate');
