-- Backs GET /programs?credential_level=&q= (global, cross-school program
-- search) added for the compare page's Credential -> Program -> College
-- search-bar flow.
--
-- idx_programs_cip_credential (cip_code, credential_level) and
-- idx_programs_title_trgm (title gin_trgm_ops) already exist (see
-- indexes.sql) and back GET /programs/:cip_code/schools — no new index
-- needed for that endpoint.

CREATE INDEX IF NOT EXISTS idx_programs_credlevel_title
  ON programs (credential_level, title);
