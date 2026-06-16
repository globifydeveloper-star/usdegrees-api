import { Router, Request, Response } from "express";
import pool from "../db/client";

const router = Router();

interface CollegeDropdownItem {
  unitid: number;
  school_name: string;
  city: string | null;
  state: string | null;
}

interface ApiError {
  error: string;
  details?: string;
}

function toNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === "string" ? parseInt(val, 10) : Number(val);
  return isNaN(n) ? null : n;
}

function toStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length === 0 ? null : s;
}

/**
 * GET /compare/colleges
 * Returns a lightweight list of colleges for use in compare-page dropdowns.
 *
 * Query params:
 *  - search: Optional. Filter by school name (case-insensitive partial match).
 *            When omitted, returns all colleges.
 *  - limit:  Max results to return (default 50, max 200).
 *
 * Example requests:
 *  GET /compare/colleges                        → All colleges (up to 50)
 *  GET /compare/colleges?search=Harvard         → Colleges matching "Harvard"
 *  GET /compare/colleges?search=mit&limit=10    → Up to 10 colleges matching "mit"
 *
 * Response: Array of { unitid, school_name, city, state }
 */
router.get(
  "/colleges",
  async (req: Request, res: Response<CollegeDropdownItem[] | ApiError>) => {
    try {
      const search = toStr(req.query.search);
      const limit = Math.min(200, Math.max(1, toNum(req.query.limit) ?? 50));

      const params: (string | number)[] = [];
      let whereClause = "";

      if (search) {
        params.push(`%${search}%`);
        whereClause = `WHERE LOWER(s.name) LIKE LOWER($1)`;
      }

      const sql = `
        SELECT
          s.unitid,
          s.name AS school_name,
          s.city,
          s.state
        FROM schools s
        ${whereClause}
        ORDER BY s.name ASC
        LIMIT $${params.length + 1}
      `;

      params.push(limit);

      const result = await pool.query<CollegeDropdownItem>(sql, params);

      const colleges: CollegeDropdownItem[] = result.rows.map((row) => ({
        unitid: toNum(row.unitid) ?? 0,
        school_name: toStr(row.school_name) ?? "Unknown",
        city: toStr(row.city),
        state: toStr(row.state),
      }));

      res.json(colleges);
    } catch (error) {
      console.error("Error fetching compare colleges:", error);
      res.status(500).json({
        error: "Failed to fetch colleges",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
