import { Router, Request, Response } from "express";
import pool from "../db/client";
import { OutcomesRow, OutcomesResponse } from "../types/outcomes";

// ---------------------------------------------------------------------------
// Helper — safely coerce nullable / non-finite numeric DB values
// ---------------------------------------------------------------------------

/**
 * Returns a finite number or null.
 * Protects against NaN / Infinity from computed DB columns or
 * numeric strings returned by the pg driver.
 */
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
 * GET /outcomes/:unitid/:cip_code
 *
 * Returns earnings, employment, and financial outcome metrics
 * for a specific college + program combination.
 *
 * Path params:
 *  - unitid    — IPEDS unit identifier for the school
 *  - cip_code  — Classification of Instructional Programs code
 */
router.get("/:unitid/:cip_code", async (req: Request, res: Response) => {
  const { unitid, cip_code } = req.params;
  const unitidRaw = Array.isArray(unitid) ? unitid[0] : unitid;
  const cipCode = Array.isArray(cip_code) ? cip_code[0] : cip_code;

  // ── Input validation ─────────────────────────────────────────────────────
  const unitidNum = parseInt(unitidRaw, 10);
  if (isNaN(unitidNum) || !cipCode?.trim()) {
    res.status(400).json({
      error: "Bad request",
      details:
        "unitid must be a valid integer and cip_code must be a non-empty string.",
    });
    return;
  }

  // ── SQL ──────────────────────────────────────────────────────────────────
  //
  // Join strategy
  // ─────────────────────────────────────────────────────────────────────────
  // earnings_against_courses → driving table, filtered by unitid + cip_code
  //
  // completion               → LEFT JOIN on unitid ONLY.
  //                            The completion table has no cip_code column
  //                            (PK is unitid). emp_factor is school-level data.
  //
  // debt_income_ratio        → LEFT JOIN on unitid + cip_code (program-level).
  //
  // LIMIT 1 guards against fan-out duplicates from any joined table.
  // ─────────────────────────────────────────────────────────────────────────

  const sql = `
    SELECT
      -- ── Earnings (program-level) ───────────────────────────────────────
      ec.year_1                       AS year_1,
      ec.year_5                       AS year_5,
      ec.year_10                      AS year_10,

      -- ── Employment factor (school-level) ──────────────────────────────
      -- completion table is keyed by unitid only — no cip_code column exists.
      co.emp_factor                   AS emp_factor,

      -- ── Debt-to-income ratio (program-level) ──────────────────────────
      di.debt_income_ratio            AS debt_income_ratio

    FROM earnings_against_courses ec

    /* completion is school-level only — join on unitid alone */
    LEFT JOIN completion co
      ON co.unitid = ec.unitid

    /* debt_income_ratio is program-level — join on unitid + cip_code */
    LEFT JOIN debt_income_ratio di
      ON  di.unitid   = ec.unitid
    WHERE ec.unitid   = $1
      AND ec.cip_code = $2

    /* Safety cap — prevents duplicate rows if any joined table
       has multiple rows per (unitid, cip_code) */
    LIMIT 1
  `;

  const params = [unitidNum, cipCode.trim()];

  // ── Execute ───────────────────────────────────────────────────────────────
  try {
    const { rows } = await pool.query<OutcomesRow>(sql, params);

    if (rows.length === 0) {
      res.status(404).json({
        error: "Not found",
        details: `No outcomes data found for unitid=${unitidNum} and cip_code=${cipCode}.`,
      });
      return;
    }

    const row = rows[0];

    // ── Shape nested response ─────────────────────────────────────────────
    const response: OutcomesResponse = {
      earnings: {
        year_1: safeNum(row.year_1),
        year_5: safeNum(row.year_5),
        year_10: safeNum(row.year_10),
      },
      completion: {
        emp_factor: safeNum(row.emp_factor),
      },
      debt_income_ratio: {
        debt_income_ratio: safeNum(row.debt_income_ratio),
      },
    };

    res.json(response);
  } catch (err) {
    console.error(
      `[/outcomes/${unitidNum}/${cipCode}] Query error:`,
      (err as Error).message,
    );
    res.status(500).json({
      error: "Internal server error",
      details: (err as Error).message,
    });
  }
});

export default router;
