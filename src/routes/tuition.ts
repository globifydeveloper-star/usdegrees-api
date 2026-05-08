/**
 * tuition.ts
 * Express Router: GET /tuition/:unitid
 *
 * Returns aggregated tuition, housing, expenses, financial aid,
 * and repayment data for a given college (unitid).
 *
 * Tables used:
 *   costs     — tuition, books, room & board, living expenses
 *   aid       — financial aid percentages and loan stats
 *   repayment — 1yr / 3yr repayment rates by completion status
 */

import { Router, Request, Response } from "express";
import { QueryResult } from "pg";
import pool from "../db/client";
import { ApiError } from "../types/tuition";

// ─────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────

/** Raw row returned by the JOIN query */
interface TuitionRawRow {
  // costs
  tuition_in_state: number | null;
  tuition_out_state: number | null;
  booksupply: number | null;
  roomboard_oncampus: number | null;
  roomboard_offcampus: number | null;
  otherexpense_oncampus: number | null;
  otherexpense_offcampus: number | null;
  otherexpense_withfamily: number | null;
  // aid
  aid_percentage: number | null;
  students_with_any_loan: number | null;
  // repayment
  all_borrowers_3yr: number | null;
  graduates_3yr: number | null;
  non_completers_3yr: number | null;
  yr1_overall: number | null;
  yr3_overall: number | null;
  yr3_completers: number | null;
  yr3_noncompleters: number | null;
}

/** Shaped API response */
export interface TuitionResponse {
  unitid: number;
  tuition: {
    tuition_in_state: number | null;
    tuition_out_state: number | null;
    booksupply: number | null;
  };
  housing: {
    roomboard_oncampus: number | null;
    roomboard_offcampus: number | null;
  };
  expenses: {
    otherexpense_oncampus: number | null;
    otherexpense_offcampus: number | null;
    otherexpense_withfamily: number | null;
  };
  financial_aid: {
    aid_percentage: number | null;
    students_with_any_loan: number | null;
  };
  repayment: {
    all_borrowers_3yr: number | null;
    graduates_3yr: number | null;
    non_completers_3yr: number | null;
    yr1_overall: number | null;
    yr3_overall: number | null;
    yr3_completers: number | null;
    yr3_noncompleters: number | null;
  };
}

/** Standard API error envelope */


// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Coerce a value to number | null.
 * pg returns numeric columns as strings; parseFloat guards this.
 */
function toNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === "string" ? parseFloat(val) : Number(val);
  return isNaN(n) ? null : n;
}

/**
 * Build the shaped response from a raw DB row.
 * Every field is passed through toNum() to handle pg's
 * string-coercion of NUMERIC/DECIMAL columns.
 */
function shapeResponse(unitid: number, row: TuitionRawRow): TuitionResponse {
  return {
    unitid,
    tuition: {
      tuition_in_state: toNum(row.tuition_in_state),
      tuition_out_state: toNum(row.tuition_out_state),
      booksupply: toNum(row.booksupply),
    },
    housing: {
      roomboard_oncampus: toNum(row.roomboard_oncampus),
      roomboard_offcampus: toNum(row.roomboard_offcampus),
    },
    expenses: {
      otherexpense_oncampus: toNum(row.otherexpense_oncampus),
      otherexpense_offcampus: toNum(row.otherexpense_offcampus),
      otherexpense_withfamily: toNum(row.otherexpense_withfamily),
    },
    financial_aid: {
      aid_percentage: toNum(row.aid_percentage),
      students_with_any_loan: toNum(row.students_with_any_loan),
    },
    repayment: {
      all_borrowers_3yr: toNum(row.all_borrowers_3yr),
      graduates_3yr: toNum(row.graduates_3yr),
      non_completers_3yr: toNum(row.non_completers_3yr),
      yr1_overall: toNum(row.yr1_overall),
      yr3_overall: toNum(row.yr3_overall),
      yr3_completers: toNum(row.yr3_completers),
      yr3_noncompleters: toNum(row.yr3_noncompleters),
    },
  };
}

// ─────────────────────────────────────────────
// SQL
// ─────────────────────────────────────────────

/**
 * Single-pass JOIN across costs, aid, and repayment.
 *
 * Design decisions:
 *  - costs is the LEFT anchor (most colleges will have cost data)
 *  - aid and repayment use LEFT JOIN so missing rows don't drop
 *    the college from the result set
 *  - LIMIT 1 on each subquery collapses any duplicate rows that
 *    arise from one-to-many relationships (e.g. multiple aid
 *    rows per unitid)
 *  - All column references use table aliases to avoid ambiguity
 */
const TUITION_QUERY = `
  SELECT
    -- ── Tuition & Books ──────────────────────────────────
    c.tuition_in_state,
    c.tuition_out_state,
    c.booksupply,

    -- ── Housing ──────────────────────────────────────────
    c.roomboard_oncampus,
    c.roomboard_offcampus,

    -- ── Living Expenses ───────────────────────────────────
    c.otherexpense_oncampus,
    c.otherexpense_offcampus,
    c.otherexpense_withfamily,

    -- ── Financial Aid ─────────────────────────────────────
    a.aid_percentage,
    a.students_with_any_loan,

    -- ── Repayment ─────────────────────────────────────────
    r.all_borrowers_3yr,
    r.graduates_3yr,
    r.non_completers_3yr,
    r.yr1_overall,
    r.yr3_overall,
    r.yr3_completers,
    r.yr3_noncompleters

  FROM (
    -- Subquery prevents duplicate cost rows when the costs table
    -- stores multiple years; we take the most recent record.
    SELECT *
    FROM costs
    WHERE unitid = $1
    LIMIT 1
  ) c

  -- Aid data: LEFT JOIN so colleges without aid rows are preserved.
  -- LIMIT 1 inside a lateral-style subquery prevents fan-out.
  LEFT JOIN LATERAL (
    SELECT
      aid_percentage,
      students_with_any_loan
    FROM aid
    WHERE unitid = c.unitid
    LIMIT 1
  ) a ON TRUE

  -- Repayment data: same pattern — LEFT JOIN + LATERAL LIMIT 1.
  LEFT JOIN LATERAL (
    SELECT
      all_borrowers_3yr,
      graduates_3yr,
      non_completers_3yr,
      yr1_overall,
      yr3_overall,
      yr3_completers,
      yr3_noncompleters
    FROM repayment
    WHERE unitid = c.unitid
    LIMIT 1
  ) r ON TRUE
`;

/*
 * ─── NOTE on LATERAL vs plain LEFT JOIN ──────────────────────────────────────
 *
 * If your aid / repayment tables already have a unique constraint on
 * (unitid) — i.e. only one row per college — you can simplify to:
 *
 *   LEFT JOIN aid       a ON a.unitid = c.unitid
 *   LEFT JOIN repayment r ON r.unitid = c.unitid
 *
 * Use LATERAL when you need per-row ORDER BY + LIMIT to avoid duplicates.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────

/**
 * createTuitionRouter
 *
 * Factory function — accepts a pg Pool instance so the router
 * does not own the connection lifecycle. Pass the same pool
 * used by the rest of your Express app.
 *
 * Usage in app.ts / server.ts:
 *   import { createTuitionRouter } from "./routes/tuition";
 *   app.use("/tuition", createTuitionRouter(pool));
 */
const router = Router();

/**
 * GET /tuition/:unitid
 *
 * Path params:
 *   unitid  — integer college identifier (College Scorecard / IPEDS)
 *
 * Responses:
 *   200  TuitionResponse   — data found
 *   400  ApiError          — unitid is not a valid integer
 *   404  ApiError          — no cost record found for this unitid
 *   500  ApiError          — unexpected database / server error
 */
router.get(
  "/:unitid",
  async (req: Request<{ unitid: string }>, res: Response) => {
      // ── 1. Validate & parse unitid ─────────────────────────────
      const raw = req.params.unitid;
      const unitid = parseInt(raw, 10);

      if (isNaN(unitid) || unitid <= 0) {
        const err: ApiError = {
          error: "INVALID_UNITID",
          message: `'${raw}' is not a valid unitid. Expected a positive integer.`,
        };
        return res.status(400).json(err);
      }

      // ── 2. Query ───────────────────────────────────────────────
      let result: QueryResult<TuitionRawRow>;
      try {
        result = await pool.query<TuitionRawRow>(TUITION_QUERY, [unitid]);
      } catch (dbErr: unknown) {
        console.error("[tuition] DB error for unitid=%d:", unitid, dbErr);
        const err: ApiError = {
          error: "DATABASE_ERROR",
          message: "An internal database error occurred. Please try again.",
          unitid,
        };
        return res.status(500).json(err);
      }

      // ── 3. 404 guard ───────────────────────────────────────────
      if (result.rowCount === 0) {
        const err: ApiError = {
          error: "NOT_FOUND",
          message: `No tuition data found for unitid ${unitid}.`,
          unitid,
        };
        return res.status(404).json(err);
      }

      // ── 4. Shape & return ──────────────────────────────────────
      const payload = shapeResponse(unitid, result.rows[0]);
      return res.status(200).json(payload);
    }
  );

export default router;
