import { Router, Request, Response } from "express";
import pool from "../db/client";
import { OverviewRow, OverviewResponse } from "../types/overview";

// ---------------------------------------------------------------------------
// Helper — safely coerce nullable numeric DB values
// ---------------------------------------------------------------------------

function safeNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * GET /overview/:unitid/:cip_code
 *
 * Path params:
 *  - unitid    — IPEDS unit identifier for the school
 *  - cip_code  — CIP code for the program
 */
router.get("/:unitid/:cip_code", async (req: Request, res: Response) => {
  const { unitid, cip_code } = req.params;
  const unitidRaw = Array.isArray(unitid) ? unitid[0] : unitid;
  const cipCode = Array.isArray(cip_code) ? cip_code[0] : cip_code;
  let credentialTitle = (req.query.credential_title as string) || null;

  const unitidNum = parseInt(unitidRaw, 10);
  if (isNaN(unitidNum) || !cipCode?.trim()) {
    res.status(400).json({
      error: "Bad request",
      details:
        "unitid must be a number and cip_code must be a non-empty string.",
    });
    return;
  }

  let cleanCip = cipCode.replace(/\./g, "").trim();

  if (cleanCip.toLowerCase() === "default") {
    try {
      const defaultProgRes = await pool.query(
        "SELECT cip_code, credential_title FROM programs WHERE unitid = $1 LIMIT 1",
        [unitidNum]
      );
      if (defaultProgRes.rows.length > 0) {
        cleanCip = defaultProgRes.rows[0].cip_code;
        if (!credentialTitle) {
          credentialTitle = defaultProgRes.rows[0].credential_title;
        }
      } else {
        cleanCip = "";
      }
    } catch (err) {
      console.error("[overviewDetails] Error fetching default program:", err);
    }
  }

  cleanCip = cleanCip.padStart(4, "0").substring(0, 4);

  // ── SQL ──────────────────────────────────────────────────────────────────
  //
  // Join strategy
  // ─────────────────────────────────────────────────────────────────────────
  // schools                  → driving table                      (must exist)
  // admissions               → LEFT JOIN on unitid                (school-level)
  // students                 → LEFT JOIN on unitid                (school-level)
  // completion               → LEFT JOIN on unitid                (school-level)
  // costs                    → LEFT JOIN on unitid                (school-level)
  // earnings_against_courses → LEFT JOIN on unitid + cip_code     (program-level)
  // programs                 → LEFT JOIN LATERAL on unitid + cip_code matching credential_title preference
  // program_descriptions     → LEFT JOIN LATERAL on unitid + cip_code matching program credential_title
  // roi                      → LEFT JOIN on unitid + credential_level
  // ─────────────────────────────────────────────────────────────────────────

  const sql = `
    SELECT
      -- ── School ────────────────────────────────────────────────────────
      s.unitid                    AS unitid,
      s.program_count             AS program_count,

      -- ── School Descriptions (large text field) ────────────────────────
      sd.school_descriptions      AS school_descriptions,

      -- ── Admissions ────────────────────────────────────────────────────
      ad.admission_rate           AS admission_rate,
      ad.sat_rw_min               AS sat_rw_min,
      ad.sat_rw_max               AS sat_rw_max,
      ad.sat_math_min             AS sat_math_min,
      ad.sat_math_max             AS sat_math_max,
      ad.sat_avg_overall          AS sat_avg_overall,

      -- ── Students ──────────────────────────────────────────────────────
      st.size                     AS size,
      st.student_faculty_ratio    AS student_faculty_ratio,
      st.retention_rate           AS retention_rate,
      st.fafsa_applications       AS fafsa_applications,

      -- ── Completion ────────────────────────────────────────────────────
      co.completion_rate          AS completion_rate,

      -- ── Earnings (program-level) ───────────────────────────────────────
      ec.year_1                   AS year_1,
      ec.year_10                  AS year_10,
      ec.growth_rate              AS growth_rate,

      -- ── ROI (keyed by unitid + credential_level from programs table) ───
      r.roi_20yr                  AS roi_20yr,

      -- ── Costs / ROI supplementary data ────────────────────────────────
      c.for_roi_data              AS for_roi_data,

      -- ── Program Info ──────────────────────────────────────────────────
      p.cip_code                  AS program_cip_code,
      p.title                     AS program_title,
      p.credential_title          AS program_credential_title,
      pd.program_description      AS program_description

    FROM schools s

    /* School descriptions — large text field, school level */
    LEFT JOIN school_descriptions sd
      ON sd.unitid::bigint = s.unitid

    /* Admission rate — school level */
    LEFT JOIN admissions ad
      ON ad.unitid = s.unitid

    /* Enrolment, faculty ratio, retention — school level */
    LEFT JOIN students st
      ON st.unitid = s.unitid

    /* Completion rate — school level */
    LEFT JOIN completion co
      ON co.unitid = s.unitid

    /* Costs — school level, supplies for_roi_data blob */
    LEFT JOIN costs c
      ON c.unitid = s.unitid

    /* Earnings — program level: unitid + cip_code */
    LEFT JOIN earnings_against_courses ec
      ON ec.unitid   = s.unitid
     AND replace(ec.cip_code, '.', '') = $2

    /* Programs — coordinate matching of credential level based on preference */
    LEFT JOIN LATERAL (
      SELECT p2.credential_level, p2.credential_title, p2.title, p2.cip_code
      FROM programs p2
      WHERE p2.unitid = s.unitid
        AND p2.cip_code = $2
      ORDER BY
        CASE
          WHEN $3::text IS NOT NULL AND p2.credential_title ILIKE $3 THEN 1
          WHEN p2.credential_title ILIKE 'Bachelor%' THEN 2
          ELSE 3
        END ASC
      LIMIT 1
    ) p ON TRUE

    /* Program descriptions — match by resolved program title and credential */
    LEFT JOIN LATERAL (
      SELECT pd2.program_description
      FROM program_descriptions pd2
      WHERE pd2.unitid::bigint = s.unitid
        AND replace(pd2.cip_code, '.', '') = $2
        AND pd2.credential_title = p.credential_title
      LIMIT 1
    ) pd ON TRUE

    /* ROI — joined on unitid + credential_level sourced from programs. */
    LEFT JOIN roi r
      ON r.unitid           = s.unitid
     AND r.credential_level = p.credential_level

    WHERE s.unitid = $1

    LIMIT 1
  `;

  const params = [unitidNum, cleanCip, credentialTitle];

  try {
    const { rows } = await pool.query<OverviewRow>(sql, params);

    if (rows.length === 0) {
      res.status(404).json({
        error: "Not found",
        details: `No data found for unitid=${unitidNum} and cip_code=${cipCode}.`,
      });
      return;
    }

    const row = rows[0];

    const response: OverviewResponse = {
      school: {
        unitid: row.unitid,
        program_count: safeNum(row.program_count),
        school_description: row.school_descriptions ?? null,
      },
      admissions: {
        admission_rate: safeNum(row.admission_rate),
        sat_rw_min: safeNum(row.sat_rw_min),
        sat_rw_max: safeNum(row.sat_rw_max),
        sat_math_min: safeNum(row.sat_math_min),
        sat_math_max: safeNum(row.sat_math_max),
        sat_avg_overall: safeNum(row.sat_avg_overall),
      },
      students: {
        size: safeNum(row.size),
        student_faculty_ratio: row.student_faculty_ratio ?? null,
        retention_rate: safeNum(row.retention_rate),
        fafsa_applications: safeNum(row.fafsa_applications),
      },
      completion: {
        completion_rate: safeNum(row.completion_rate),
      },
      earnings: {
        year_1: safeNum(row.year_1),
        year_10: safeNum(row.year_10),
        growth_rate: safeNum(row.growth_rate),
      },
      roi: {
        roi_20yr: safeNum(row.roi_20yr),
        for_roi_data: row.for_roi_data ?? null,
      },
      program: row.program_cip_code
        ? {
            cip_code: row.program_cip_code,
            title: row.program_title ?? null,
            credential_title: row.program_credential_title ?? null,
            program_description: row.program_description ?? null,
          }
        : null,
    };

    res.json(response);
  } catch (err) {
    console.error(
      `[/overview/${unitidNum}/${cipCode}] Query error:`,
      (err as Error).message,
    );
    res.status(500).json({
      error: "Internal server error",
      details: (err as Error).message,
    });
  }
});

export default router;
