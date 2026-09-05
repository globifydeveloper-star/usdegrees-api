/**
 * collegeSummary.ts
 * Express Router: GET /college-summary/:unitid
 *
 * Union of GET /tuition/:unitid and GET /campus/:unitid in a single round
 * trip, for callers (e.g. the compare-page college details modal) that
 * need both. Reuses the exact same query/shaping functions as those two
 * routes — no separate computation, no renamed/trimmed fields.
 */

import { Router, Request, Response } from "express";
import { ApiError as TuitionApiError, TuitionResponse } from "../types/tuition";
import { CampusStudentsResponse } from "../types/campus";
import { getTuitionData } from "./tuition";
import { getCampusData } from "./campus";

const router = Router();

/**
 * GET /college-summary/:unitid
 *
 * Path params:
 *   unitid  — integer college identifier (College Scorecard / IPEDS)
 *
 * Responses:
 *   200  { unitid, tuition, housing, expenses, financial_aid, school_type,
 *          net_price, campus, students, repayment } — union of the tuition
 *          and campus responses
 *   400  ApiError               — unitid is not a valid integer
 *   404  ApiError               — neither tuition nor campus data found
 *   500  ApiError               — unexpected database / server error
 */
router.get(
  "/:unitid",
  async (req: Request<{ unitid: string }>, res: Response) => {
    const raw = req.params.unitid;
    const unitid = parseInt(raw, 10);

    if (isNaN(unitid) || unitid <= 0) {
      const err: TuitionApiError = {
        error: "INVALID_UNITID",
        message: `'${raw}' is not a valid unitid. Expected a positive integer.`,
      };
      return res.status(400).json(err);
    }

    let tuition: TuitionResponse | null;
    let campus: CampusStudentsResponse | null;
    try {
      [tuition, campus] = await Promise.all([
        getTuitionData(unitid),
        getCampusData(unitid),
      ]);
    } catch (dbErr: unknown) {
      console.error("[college-summary] DB error for unitid=%d:", unitid, dbErr);
      const err: TuitionApiError = {
        error: "DATABASE_ERROR",
        message: "An internal database error occurred. Please try again.",
        unitid,
      };
      return res.status(500).json(err);
    }

    if (tuition === null && campus === null) {
      const err: TuitionApiError = {
        error: "NOT_FOUND",
        message: `No tuition or campus data found for unitid ${unitid}.`,
        unitid,
      };
      return res.status(404).json(err);
    }

    const payload = {
      unitid,
      tuition: tuition?.tuition ?? null,
      housing: tuition?.housing ?? null,
      expenses: tuition?.expenses ?? null,
      financial_aid: tuition?.financial_aid ?? null,
      school_type: tuition?.school_type ?? null,
      net_price: tuition?.net_price ?? null,
      campus: campus?.campus ?? null,
      students: campus?.students ?? null,
      repayment: campus?.repayment ?? null,
    };

    return res.status(200).json(payload);
  },
);

export default router;
