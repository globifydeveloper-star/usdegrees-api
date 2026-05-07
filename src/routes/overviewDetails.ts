import { Router, Request, Response } from "express";
import pool from "../db/client";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

/**
 * Raw shape returned directly from the PostgreSQL query (single flat row).
 * All LEFT-JOIN fields are typed as nullable since they may not exist for
 * every unitid / cip_code combination.
 */
interface OverviewRow {
  // schools
  unitid: number;
  program_count: number | null;

  // admissions
  admission_rate: number | null;

  // students
  size: number | null;
  student_faculty_ratio: string | null;
  retention_rate: number | null;
  fafsa_applications: number | null;

  // completion
  completion_rate: number | null;

  // earnings_against_courses (keyed by unitid + cip_code)
  year_1: number | null;
  year_10: number | null;
  growth_rate: number | null;

  // roi (keyed by unitid + credential_level)
  roi_20yr: number | null;

  // costs (used for ROI supplementary data)
  for_roi_data: Record<string, unknown> | null;
}

/**
 * Nested response shape sent back to the client.
 */
export interface OverviewResponse {
  school: {
    unitid: number;
    program_count: number | null;
  };
  admissions: {
    admission_rate: number | null;
  };
  students: {
    size: number | null;
    student_faculty_ratio: string | null;
    retention_rate: number | null;
    fafsa_applications: number | null;
  };
  completion: {
    completion_rate: number | null;
  };
  earnings: {
    year_1: number | null;
    year_10: number | null;
    growth_rate: number | null;
  };
  roi: {
    roi_20yr: number | null;
    for_roi_data: Record<string, unknown> | null;
  };
}

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

  const unitidNum = parseInt(unitidRaw, 10);
  if (isNaN(unitidNum) || !cipCode?.trim()) {
    res.status(400).json({
      error: "Bad request",
      details: "unitid must be a number and cip_code must be a non-empty string.",
    });
    return;
  }

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
  // programs                 → LEFT JOIN on unitid + cip_code     (to get credential_level)
  // roi                      → LEFT JOIN on unitid + credential_level
  //                            roi has NO cip_code column — keyed by
  //                            (unitid, credential_level) as per DB schema.
  //                            credential_level is sourced from the programs table.
  // ─────────────────────────────────────────────────────────────────────────

  const sql = `
    SELECT
      -- ── School ────────────────────────────────────────────────────────
      s.unitid                    AS unitid,
      s.program_count             AS program_count,

      -- ── Admissions ────────────────────────────────────────────────────
      ad.admission_rate           AS admission_rate,

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
      c.for_roi_data              AS for_roi_data

    FROM schools s

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
     AND ec.cip_code = $2

    /* Programs — needed to resolve credential_level for the roi JOIN.
       roi table has no cip_code column; its PK is (unitid, credential_level). */
    LEFT JOIN programs p
      ON p.unitid   = s.unitid
     AND p.cip_code = $2

    /* ROI — joined on unitid + credential_level sourced from programs.
       If programs has no matching row, p.credential_level is NULL and
       this JOIN will produce no match (safe — roi columns return NULL). */
    LEFT JOIN roi r
      ON r.unitid           = s.unitid
     AND r.credential_level = p.credential_level

    WHERE s.unitid = $1

    LIMIT 1
  `;

  const params = [unitidNum, cipCode.trim()];

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
      },
      admissions: {
        admission_rate: safeNum(row.admission_rate),
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
    };

    res.json(response);
  } catch (err) {
    console.error(
      `[/overview/${unitidNum}/${cipCode}] Query error:`,
      (err as Error).message
    );
    res.status(500).json({
      error: "Internal server error",
      details: (err as Error).message,
    });
  }
});

export default router;