/**
 * programs.ts
 * Express Router: GET /programs/:unitid
 *
 * Returns:
 *  • Graduation rate
 *  • Student-faculty ratio
 *  • Loan repayment success
 *  • Popular fields of study
 *  • Comprehensive degree levels
 *
 * Tables used:
 *   completion
 *   students
 *   repayment
 *   program_distribution
 *   programs
 */

import { Router, Request, Response } from "express";
import { QueryResult } from "pg";
import pool from "../db/client";

import {
  ProgramsResponse,
  AcademicsRawRow,
  ProgramDistributionRawRow,
  FieldOfStudy,
  DegreeLevelRawRow,
  ApiError,
} from "../types/programs";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;

  const n = typeof val === "string" ? parseFloat(val) : Number(val);

  return isNaN(n) ? null : n;
}

function toStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;

  const s = String(val).trim();

  return s.length === 0 ? null : s;
}

function toRatePct(val: unknown): number | null {
  const n = toNum(val);

  if (n === null) return null;

  return n < 2 ? Math.round(n * 100) : Math.round(n);
}

function formatRatio(val: unknown): string | null {
  const n = toNum(val);

  if (n === null) return null;

  const display =
    n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n).toString();

  return `${display}:1`;
}

// ─────────────────────────────────────────────
// Response Shapers
// ─────────────────────────────────────────────

function shapeAcademics(row: AcademicsRawRow): ProgramsResponse["academics"] {
  return {
    graduation_rate: toRatePct(row.completion_rate),

    student_faculty_ratio: formatRatio(row.student_faculty_ratio),

    repayment_success: toRatePct(row.repayment_success),
  };
}

function shapeFields(rows: ProgramDistributionRawRow[]): FieldOfStudy[] {
  return rows
    .filter((r) => r.field_name !== null && r.field_name !== "")

    .map((r) => ({
      field_name: toStr(r.field_name) as string,

      percentage: toNum(r.percentage) ?? 0,

      program_count: toNum(r.program_count) ?? 0,
    }))

    .sort((a, b) => b.percentage - a.percentage);
}

function shapeDegreeLevels(
  rows: DegreeLevelRawRow[],
): ProgramsResponse["comprehensive_degree_levels"] {
  return rows.map((r) => ({
    level: toStr(r.degree_level_category) ?? "Other",

    total_programs: toNum(r.total_programs) ?? 0,

    top_titles: Array.isArray(r.top_titles) ? r.top_titles.filter(Boolean) : [],
  }));
}

// ─────────────────────────────────────────────
// SQL Queries
// ─────────────────────────────────────────────

const ACADEMICS_QUERY = `
  SELECT
    comp.completion_rate,

    stu.student_faculty_ratio,

    rep.repayment_success

  FROM (
    SELECT completion_rate
    FROM completion
    WHERE unitid = $1
    LIMIT 1
  ) comp

  LEFT JOIN LATERAL (
    SELECT student_faculty_ratio
    FROM students
    WHERE unitid = $1
    LIMIT 1
  ) stu ON TRUE

  LEFT JOIN LATERAL (
    SELECT repayment_success
    FROM repayment
    WHERE unitid = $1
    LIMIT 1
  ) rep ON TRUE
`;

const FIELDS_QUERY = `
  SELECT
    field_name,
    percentage,
    program_count

  FROM program_distribution

  WHERE unitid = $1

  ORDER BY
    percentage DESC,
    field_name ASC

  LIMIT 20
`;

const DEGREE_LEVELS_QUERY = `
WITH ranked_programs AS (
  SELECT
    degree_level_category,
    title,

    ROW_NUMBER() OVER (
      PARTITION BY degree_level_category
      ORDER BY title ASC
    ) as rn

  FROM programs

  WHERE unitid = $1
)

SELECT
  p.degree_level_category,

  COUNT(*) as total_programs,

  ARRAY(
    SELECT DISTINCT rp.title
    FROM ranked_programs rp
    WHERE rp.degree_level_category =
      p.degree_level_category
    LIMIT 3
  ) as top_titles

FROM programs p

WHERE unitid = $1

GROUP BY p.degree_level_category

ORDER BY
  CASE
    WHEN p.degree_level_category =
      'Undergraduate' THEN 1

    WHEN p.degree_level_category =
      'Graduate' THEN 2

    WHEN p.degree_level_category =
      'Professional' THEN 3

    ELSE 4
  END
`;

// ─────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────

const router = Router();

/**
 * GET /programs/:unitid
 */

router.get(
  "/:unitid",

  async (req: Request<{ unitid: string }>, res: Response) => {
    // ─────────────────────────────────────
    // 1. Validate unitid
    // ─────────────────────────────────────

    const raw = req.params.unitid;

    const unitid = parseInt(raw, 10);

    if (isNaN(unitid) || unitid <= 0) {
      const err: ApiError = {
        error: "INVALID_UNITID",

        message: `'${raw}' is not a valid unitid. Expected a positive integer.`,
      };

      return res.status(400).json(err);
    }

    // ─────────────────────────────────────
    // 2. Execute Queries
    // ─────────────────────────────────────

    let academicsResult: QueryResult<AcademicsRawRow>;

    let fieldsResult: QueryResult<ProgramDistributionRawRow>;

    let degreeLevelsResult: QueryResult<DegreeLevelRawRow>;

    try {
      [academicsResult, fieldsResult, degreeLevelsResult] = await Promise.all([
        pool.query<AcademicsRawRow>(ACADEMICS_QUERY, [unitid]),

        pool.query<ProgramDistributionRawRow>(FIELDS_QUERY, [unitid]),

        pool.query<DegreeLevelRawRow>(DEGREE_LEVELS_QUERY, [unitid]),
      ]);
    } catch (dbErr: unknown) {
      console.error("[programs] DB error for unitid=%d:", unitid, dbErr);

      const err: ApiError = {
        error: "DATABASE_ERROR",

        message: "An internal database error occurred. Please try again.",

        unitid,
      };

      return res.status(500).json(err);
    }

    // ─────────────────────────────────────
    // 3. Not Found Guard
    // ─────────────────────────────────────

    if (academicsResult.rowCount === 0) {
      const err: ApiError = {
        error: "NOT_FOUND",

        message: `No academic data found for unitid ${unitid}.`,

        unitid,
      };

      return res.status(404).json(err);
    }

    // ─────────────────────────────────────
    // 4. Build Response
    // ─────────────────────────────────────

    const payload: ProgramsResponse = {
      unitid,

      academics: shapeAcademics(academicsResult.rows[0]),

      popular_fields: shapeFields(fieldsResult.rows),

      comprehensive_degree_levels: shapeDegreeLevels(degreeLevelsResult.rows),
    };

    return res.status(200).json(payload);
  },
);

export default router;
