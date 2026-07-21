import { Router, Request, Response } from "express";
import pool from "../db/client";
import { SearchQueryParams, SearchResult } from "../types/search-details";
import { normalizeEarningsFillMethod } from "../types/earnings";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

/**
* Shape of each row returned by the search query.
* Nullable fields come from LEFT JOINs and may be absent for some programs.
*/

/**
* Accepted query-string parameters for the search endpoint.
*/


// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

function safeNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
* GET /search
*
* Returns enriched program records joined across schools, admissions,
* completion, and earnings_against_courses_merged tables.
*
* Query params:
*  - credential_title  exact match on programs.credential_title
*  - state             exact match on schools.state
*  - title             case-insensitive partial match on programs.title
*/
router.get("/", async (req: Request, res: Response) => {
  const { credential_title, state, title } = req.query as SearchQueryParams;

  // Collected bind parameters (positional $1, $2, …)
  const params: (string | number)[] = [];

  // ---------------------------------------------------------------------------
  // Base SQL
  //
  // JOIN strategy:
  //  • schools       → INNER JOIN  (every program must have a school)
  //  • admissions    → LEFT JOIN on (unitid)            — may be missing
  //  • completion    → LEFT JOIN on (unitid + cip_code) — may be missing
  //  • earnings…     → LEFT JOIN on (unitid + cip_code) — may be missing
  //
  // DISTINCT prevents duplicates when the joined tables have multiple rows
  // per (unitid, cip_code) pair.
  // ---------------------------------------------------------------------------
  let sql = `
  SELECT DISTINCT
    -- programs
    p.title                     AS program_title,
    p.cip_code                  AS cip_code,
    p.credential_title          AS credential_title,
    p.credential_level          AS credential_level,
    p.school_type               AS school_type,

    -- schools
    s.name                      AS school_name,
    s.city                      AS city,
    s.state                     AS state,
    s.school_url                AS school_url,
    s.unitid                    AS unitid,
    s.is_active                 AS is_active,
    s.accreditor                AS accreditor,

    -- admissions (nullable)
    ad.admission_rate           AS admission_rate,
    ad.school_min_range         AS school_min_range,
    ad.school_max_range         AS school_max_range,

    -- completion (nullable)
    co.emp_factor               AS emp_factor,

    -- earnings (nullable)
    ec.year_5                   AS earnings_year_5,
    ec.year_5_method            AS earnings_year_5_method,

    -- roi (nullable)
    roi_data.roi_20yr          AS roi_20yr

  FROM programs p

  /* Every program must belong to a known school */
  JOIN schools s
    ON p.unitid = s.unitid

  /* Admission data may not exist for every school */
  LEFT JOIN admissions ad
    ON p.unitid = ad.unitid

  /* Completion data keyed by school + program (cip_code) */
  LEFT JOIN completion co
    ON p.unitid = co.unitid

  /* Earnings data keyed by school + program (cip_code).
     earnings_against_courses_merged is the source of truth; rollback to
     earnings_against_courses (raw, no fill-method tracking) if needed. */
  LEFT JOIN earnings_against_courses_merged ec
    ON p.unitid   = ec.unitid
   AND p.cip_code = replace(ec.cip_code, '.', '')

  /* ROI — exact credential_level match preferred, school-level fallback */
  LEFT JOIN LATERAL (
    SELECT roi_20yr
    FROM roi
    WHERE unitid = p.unitid
    ORDER BY CASE
      WHEN credential_level = p.credential_level THEN 0
      ELSE 1
    END
    LIMIT 1
  ) roi_data ON TRUE
  WHERE 1=1
`;

  // ---------------------------------------------------------------------------
  // Dynamic filters — parameterized to prevent SQL injection
  // ---------------------------------------------------------------------------

  if (credential_title) {
    params.push(credential_title);
    sql += ` AND p.credential_title = $${params.length}`;
  }

  if (state) {
    params.push(state);
    sql += ` AND s.state = $${params.length}`;
  }

  if (title) {
    // Wrap the value so LIKE matching works; LOWER() on both sides for
    // case-insensitive search without requiring a case-insensitive collation.
    params.push(`%${title}%`);
    sql += ` AND LOWER(p.title) LIKE LOWER($${params.length})`;
  }

  // ---------------------------------------------------------------------------
  // Ordering & pagination
  // Results ordered alphabetically by program title; hard-capped at 50 rows.
  // ---------------------------------------------------------------------------
  sql += ` ORDER BY p.title ASC LIMIT 1000`;

  // ---------------------------------------------------------------------------
  // Execute
  // ---------------------------------------------------------------------------
  try {
    const { rows } = await pool.query<SearchResult>(sql, params);
    res.json(
      rows.map((row) => ({
        ...row,
        unitid: safeNum(row.unitid),
        admission_rate: safeNum(row.admission_rate),
        school_min_range: safeNum(row.school_min_range),
        school_max_range: safeNum(row.school_max_range),
        emp_factor: safeNum(row.emp_factor),
        earnings_year_5: safeNum(row.earnings_year_5),
        earnings_year_5_method: normalizeEarningsFillMethod(row.earnings_year_5_method),
        roi_20yr: safeNum(row.roi_20yr),
      }))
    );
  } catch (err) {
    console.error("[/search] Query error:", (err as Error).message);
    res.status(500).json({
      error: "Internal server error",
      details: (err as Error).message,
    });
  }
});

export default router;
