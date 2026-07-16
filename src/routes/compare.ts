import { Router, Request, Response } from "express";
import pool from "../db/client";
import { verifyToken } from "../middleware/auth";
import { AuthRequest } from "../types/user";
import { getAthleticsProfile } from "../services/athletics.service";
import { AthleticsProfile } from "../types/athletics";

const router = Router();

const MAX_COMPARE_ATHLETICS = 4;

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
  verifyToken,
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

// ===========================================================================
// /compare/selected — the caller's current comparison set, backed by the
// EXISTING user_compare_history table (history of comparison events).
//
// Model: each row = a SET of unitids (jsonb array) compared at created_at.
//   - current set      = compared_colleges of the caller's LATEST row
//   - POST add         = append a new row with union(current, added) if changed
//   - DELETE remove    = append a new row with (current - unitid); past rows kept
//   - addedAt(unitid)  = MIN(created_at) over the caller's rows containing it
// All routes are caller-scoped to their resolved usdusers.id.
// ===========================================================================

interface SelectedItem {
  unitid: number | null;
  name: string | null;
  location: string | null;
  tuitionInState: number | null; // costs.tuition_in_state (IN-STATE specifically)
  acceptanceRate: number | null; // admissions.admission_rate
  addedAt: string | Date | null; // earliest created_at across history
  schoolUrl: string | null; // schools.school_url, normalized to absolute
}

/**
 * Normalize a school URL for safe linking: null/empty -> null; already has
 * http(s):// -> untouched; otherwise prefix https://.
 */
function normalizeUrl(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/** Resolve the verified firebase_uid (req.userId) to the integer usdusers.id. */
async function resolveUserId(firebaseUid: string): Promise<string | null> {
  const r = await pool.query<{ id: string }>(
    "SELECT id FROM usdusers WHERE firebase_uid = $1",
    [firebaseUid],
  );
  return r.rows.length ? r.rows[0].id : null;
}

/** Collect unitids from a { unitid } or { unitids: [...] } body as positive ints. */
function collectUnitids(body: Record<string, unknown>): number[] {
  const raw: unknown[] = Array.isArray(body.unitids)
    ? body.unitids
    : body.unitid !== undefined
      ? [body.unitid]
      : [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const v of raw) {
    const n = toNum(v);
    if (n === null || !Number.isInteger(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** Float-safe numeric parse (admission_rate etc. arrive from pg as strings). */
function toFloat(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === "string" ? parseFloat(val) : Number(val);
  return Number.isFinite(n) ? n : null;
}

function toLocation(city: unknown, state: unknown): string | null {
  const parts = [city, state]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter((v) => v.length > 0);
  return parts.length ? parts.join(", ") : null;
}

/** The caller's current comparison set = unitids in their latest history row. */
async function getCurrentSet(userId: string): Promise<number[]> {
  const r = await pool.query<{ compared_colleges: unknown }>(
    `SELECT compared_colleges FROM user_compare_history
      WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [userId],
  );
  if (r.rows.length === 0 || !Array.isArray(r.rows[0].compared_colleges))
    return [];
  return (r.rows[0].compared_colleges as unknown[])
    .map((v) => toNum(v))
    .filter((n): n is number => n !== null && Number.isInteger(n));
}

/** Enriched current set with per-unitid earliest addedAt. */
async function getSelectedEnriched(userId: string): Promise<SelectedItem[]> {
  const { rows } = await pool.query(
    `WITH latest AS (
        SELECT compared_colleges
          FROM user_compare_history
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 1
     ),
     sel AS (
        SELECT (jsonb_array_elements_text((SELECT compared_colleges FROM latest)))::bigint AS unitid
     ),
     added AS (
        -- earliest created_at for every unitid that ever appeared in the
        -- caller's history (robust to number/string element storage).
        SELECT (e.val)::bigint AS unitid, MIN(h.created_at) AS added_at
          FROM user_compare_history h
          CROSS JOIN LATERAL jsonb_array_elements_text(h.compared_colleges) AS e(val)
         WHERE h.user_id = $1
         GROUP BY (e.val)::bigint
     )
     SELECT
        sel.unitid,
        added.added_at,
        s.name              AS name,
        s.city              AS city,
        s.state             AS state,
        s.school_url        AS school_url,
        ad.admission_rate   AS admission_rate,
        c.tuition_in_state  AS tuition_in_state
     FROM sel
     JOIN added ON added.unitid = sel.unitid
     LEFT JOIN schools s ON s.unitid = sel.unitid
     LEFT JOIN LATERAL (
        SELECT admission_rate FROM admissions WHERE unitid = sel.unitid LIMIT 1
     ) ad ON TRUE
     LEFT JOIN LATERAL (
        SELECT tuition_in_state FROM costs WHERE unitid = sel.unitid LIMIT 1
     ) c ON TRUE
     ORDER BY added.added_at ASC, sel.unitid ASC`,
    [userId],
  );

  return rows.map((row) => ({
    unitid: toNum(row.unitid),
    name: row.name ?? null,
    location: toLocation(row.city, row.state),
    tuitionInState: toFloat(row.tuition_in_state),
    acceptanceRate: toFloat(row.admission_rate),
    addedAt: row.added_at ?? null,
    schoolUrl: normalizeUrl(row.school_url),
  }));
}

/**
 * POST /compare/selected   body { unitid } | { unitids: [...] }
 * Adds college(s) to the caller's comparison set. Idempotent: re-adding a
 * present college changes nothing (no new row → earliest addedAt preserved).
 * Returns the enriched current set.
 */
router.post(
  "/selected",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const incoming = collectUnitids(
        (req.body ?? {}) as Record<string, unknown>,
      );
      if (incoming.length === 0) {
        return res
          .status(400)
          .json({ error: "A valid unitid or unitids[] is required" });
      }

      const userId = await resolveUserId(req.userId as string);
      if (!userId) return res.status(404).json({ error: "User not found" });

      const current = await getCurrentSet(userId);
      const set = new Set(current);
      let changed = false;
      for (const u of incoming) {
        if (!set.has(u)) {
          set.add(u);
          changed = true;
        }
      }

      if (changed) {
        await pool.query(
          `INSERT INTO user_compare_history (user_id, compared_colleges, created_at)
         VALUES ($1, $2::jsonb, NOW())`,
          [userId, JSON.stringify([...set])],
        );
      }

      return res.json(await getSelectedEnriched(userId));
    } catch (error) {
      console.error("Add compare selection error:", error);
      return res.status(500).json({
        error: "Failed to add to comparison",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * GET /compare/selected
 * Returns the caller's current comparison set, enriched, each with addedAt
 * (earliest created_at for that unitid). Empty -> [].
 */
router.get(
  "/selected",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = await resolveUserId(req.userId as string);
      if (!userId) return res.status(404).json({ error: "User not found" });
      return res.json(await getSelectedEnriched(userId));
    } catch (error) {
      console.error("Get compare selection error:", error);
      return res.status(500).json({
        error: "Failed to fetch comparison",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * DELETE /compare/selected/:unitid
 * Removes a college from the caller's CURRENT set by appending a new history
 * row with (current - unitid). Past history rows are never modified.
 */
router.delete(
  "/selected/:unitid",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const unitid = toNum(req.params.unitid);
      if (unitid === null || !Number.isInteger(unitid) || unitid <= 0) {
        return res
          .status(400)
          .json({ error: "A valid integer unitid is required" });
      }

      const userId = await resolveUserId(req.userId as string);
      if (!userId) return res.status(404).json({ error: "User not found" });

      const current = await getCurrentSet(userId);
      if (current.includes(unitid)) {
        const next = current.filter((u) => u !== unitid);
        await pool.query(
          `INSERT INTO user_compare_history (user_id, compared_colleges, created_at)
         VALUES ($1, $2::jsonb, NOW())`,
          [userId, JSON.stringify(next)],
        );
      }

      return res.json({ ok: true });
    } catch (error) {
      console.error("Remove compare selection error:", error);
      return res.status(500).json({
        error: "Failed to remove from comparison",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

interface ApiErrorBody {
  error: string;
  details?: string;
}

/**
 * GET /compare/athletics?unitids=100654,100663,100706
 * Bulk variant of GET /colleges/:unitid/athletics for the college comparison
 * feature. Returns one profile per unitid, in the order requested. Unitids
 * with no athletic_summary row are silently omitted (not an error) so a
 * comparison set can mix schools with and without athletics data.
 *
 * Query params:
 *  - unitids: Required. Comma-separated list of unitids, max 4 (matches
 *             the existing comparison UI constraint).
 */
router.get(
  "/athletics",
  async (req: Request, res: Response<AthleticsProfile[] | ApiErrorBody>) => {
    try {
      const raw = toStr(req.query.unitids);
      if (!raw) {
        return res
          .status(400)
          .json({ error: "unitids query parameter is required" });
      }

      const unitids: number[] = [];
      const seen = new Set<number>();
      for (const part of raw.split(",")) {
        const n = toNum(part.trim());
        if (n === null || !Number.isInteger(n) || n <= 0 || seen.has(n))
          continue;
        seen.add(n);
        unitids.push(n);
      }

      if (unitids.length === 0) {
        return res
          .status(400)
          .json({ error: "unitids must contain at least one valid unitid" });
      }
      if (unitids.length > MAX_COMPARE_ATHLETICS) {
        return res.status(400).json({
          error: `A maximum of ${MAX_COMPARE_ATHLETICS} unitids can be compared at once`,
        });
      }

      const profiles = await Promise.all(
        unitids.map((id) => getAthleticsProfile(id)),
      );

      res.json(profiles.filter((p): p is AthleticsProfile => p !== null));
    } catch (error) {
      console.error("Error fetching compare athletics:", error);
      res.status(500).json({
        error: "Failed to fetch athletics comparison",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
