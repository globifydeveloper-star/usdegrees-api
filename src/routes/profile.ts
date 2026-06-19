import { Router, Response } from "express";
import { firebaseAuth } from "../config/firebase";
import pool from "../db/client";
import { verifyToken } from "../middleware/auth";
import { normalizeDegreeLevel } from "../constants/degreeLevels";
import { getValidStateCodes } from "../db/statesCache";
import { ApiError, AuthRequest } from "../types/user";

const router = Router();
const accountRouter = Router();

/**
 * Allowlist of patchable profile fields: camelCase request key -> snake_case
 * DB column. Anything NOT in this map (email, role, auth_provider, firebase_uid,
 * is_active, etc.) is silently dropped and can never be patched here.
 */
/**
 * Allowlist of patchable SCALAR profile columns. preferredStates and
 * preferredPrograms are NOT here — they live in child tables and are handled
 * by a transactional replace below.
 */
const PROFILE_FIELD_MAP: Record<string, string> = {
  fullName: "display_name",
  phone: "phone",
  address: "address",
  gpa: "gpa",
  satMath: "sat_math",
  satReadingWriting: "sat_reading_writing",
  actScore: "act_score",
  graduationYear: "graduation_year",
  highSchoolName: "high_school_name",
  preferredDegreeLevel: "preferred_degree_level",
};

/**
 * Fetch the full profile for a firebase_uid, joining the child tables into
 * preferredStates / preferredPrograms arrays (empty -> []). Returns null if
 * no user row. Never includes the password hash.
 */
async function buildProfileResponse(
  firebaseUid: string,
): Promise<Record<string, unknown> | null> {
  const result = await pool.query(
    `SELECT
        u.*,
        COALESCE(
          (SELECT array_agg(s.state_code ORDER BY s.state_code)
             FROM usdusers_preferred_states s WHERE s.user_id = u.id),
          ARRAY[]::text[]
        ) AS preferred_states,
        COALESCE(
          (SELECT array_agg(p.program ORDER BY p.program)
             FROM usdusers_preferred_programs p WHERE p.user_id = u.id),
          ARRAY[]::text[]
        ) AS preferred_programs
      FROM usdusers u
      WHERE u.firebase_uid = $1`,
    [firebaseUid],
  );
  if (result.rows.length === 0) return null;

  const { password_hash, preferred_states, preferred_programs, ...rest } =
    result.rows[0];
  return {
    ...rest,
    preferredStates: preferred_states ?? [],
    preferredPrograms: preferred_programs ?? [],
  };
}

/** Resolve the verified firebase_uid to the integer usdusers.id. */
async function resolveUserId(firebaseUid: string): Promise<string | null> {
  const r = await pool.query<{ id: string }>(
    "SELECT id FROM usdusers WHERE firebase_uid = $1",
    [firebaseUid],
  );
  return r.rows.length ? r.rows[0].id : null;
}

/** Trim, drop empty, de-duplicate a string array (for preferred programs). */
function normalizePrograms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Uppercase, validate against the states set, de-duplicate (for preferred states). */
async function normalizeStateCodes(value: unknown): Promise<string[]> {
  if (!Array.isArray(value)) return [];
  const valid = await getValidStateCodes();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== "string") continue;
    const code = v.trim().toUpperCase();
    if (!valid.has(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

/**
 * GET /profile
 * Returns the authenticated user's profile, including preferredStates and
 * preferredPrograms arrays joined from the child tables.
 */
router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await buildProfileResponse(req.userId as string);
    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: "Failed to fetch profile",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PATCH /profile
 * Updates editable profile fields. Identity fields (email, role, email_verified)
 * are NOT editable here — email is mirrored from the verified Firebase token on
 * login; never trusted from the client.
 */
router.patch("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    console.log("[profile/patch]", {
      userId: req.userId,
      bodyKeys: Object.keys(body),
    });

    // ── Scalar columns ───────────────────────────────────────────────
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, column] of Object.entries(PROFILE_FIELD_MAP)) {
      if (!(key in body) || body[key] === undefined) continue;
      let value: unknown = body[key];

      if (column === "preferred_degree_level") {
        // Accept only the 8 canonical values (legacy short forms mapped).
        // null explicitly clears; any other invalid value is stripped.
        if (value !== null) {
          const canonical = normalizeDegreeLevel(value);
          if (canonical === null) continue; // strip invalid silently
          value = canonical;
        }
      } else if (typeof value === "string") {
        value = value.trim();
      }

      sets.push(`${column} = $${i++}`);
      values.push(value);
    }

    // ── Child-table sets (transactional replace) ─────────────────────
    const hasStates =
      "preferredStates" in body && body.preferredStates !== undefined;
    const hasPrograms =
      "preferredPrograms" in body && body.preferredPrograms !== undefined;

    if (sets.length === 0 && !hasStates && !hasPrograms) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    const userId = await resolveUserId(req.userId as string);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const stateCodes = hasStates
      ? await normalizeStateCodes(body.preferredStates)
      : [];
    const programs = hasPrograms
      ? normalizePrograms(body.preferredPrograms)
      : [];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (sets.length > 0) {
        await client.query(
          `UPDATE usdusers SET ${sets.join(", ")} WHERE id = $${i}`,
          [...values, userId],
        );
      }

      // REPLACE-the-set: delete all of the caller's rows, insert the new set.
      // Empty array therefore clears all rows. Never injects defaults.
      if (hasStates) {
        await client.query(
          "DELETE FROM usdusers_preferred_states WHERE user_id = $1",
          [userId],
        );
        if (stateCodes.length > 0) {
          await client.query(
            `INSERT INTO usdusers_preferred_states (user_id, state_code)
               SELECT $1, unnest($2::text[])
               ON CONFLICT (user_id, state_code) DO NOTHING`,
            [userId, stateCodes],
          );
        }
      }

      if (hasPrograms) {
        await client.query(
          "DELETE FROM usdusers_preferred_programs WHERE user_id = $1",
          [userId],
        );
        if (programs.length > 0) {
          await client.query(
            `INSERT INTO usdusers_preferred_programs (user_id, program)
               SELECT $1, unnest($2::text[])
               ON CONFLICT (user_id, program) DO NOTHING`,
            [userId, programs],
          );
        }
      }

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    const profile = await buildProfileResponse(req.userId as string);
    res.json(profile);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      error: "Failed to update profile",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /account/delete
 * Soft-deletes the user: marks the DB row inactive and disables the Firebase
 * user so they can no longer authenticate. The row is kept (recoverable).
 */
accountRouter.post(
  "/delete",
  verifyToken,
  async (req: AuthRequest, res: Response<{ ok: true } | ApiError>) => {
    try {
      const uid = req.userId as string;

      await pool.query(
        `UPDATE usdusers
          SET is_active = false, deactivated_at = NOW()
        WHERE firebase_uid = $1`,
        [uid],
      );

      // Disable (not delete) the Firebase user — keeps it recoverable and
      // consistent with the soft delete.
      await firebaseAuth.updateUser(uid, { disabled: true });

      res.json({ ok: true });
    } catch (error) {
      console.error("Account delete error:", error);
      res.status(500).json({
        error: "Failed to delete account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export { accountRouter };
export default router;
