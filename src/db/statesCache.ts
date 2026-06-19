import pool from "./client";

/**
 * Valid 2-letter state/territory codes, sourced from the same `states` table
 * that backs GET /states — so PATCH /profile validates against exactly the
 * GET /states set. Cached for the process lifetime (reference data).
 */
let cache: Set<string> | null = null;

export async function getValidStateCodes(): Promise<Set<string>> {
  if (cache) return cache;
  const { rows } = await pool.query<{ state_code: string }>(
    "SELECT state_code FROM states",
  );
  cache = new Set(rows.map((r) => r.state_code.trim().toUpperCase()));
  return cache;
}
