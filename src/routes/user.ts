import { Router, Request, Response } from "express";
import pool from "../db/client";
import { User, UserProfile, UpsertUserBody, ApiError, AuthRequest } from "../types/user";
import { REACTIVATION_COOLDOWN_HOURS } from "./profile";
import { verifyToken } from "../middleware/auth";
import { firebaseAuth } from "../config/firebase";
import { errorDetails } from "../utils/errors";

const router = Router();

/**
 * GET /user/:id
 * Returns the CALLER'S OWN profile — :id must match the authenticated
 * caller's own usdusers.id. Previously this required only `verifyToken`
 * (any valid session) with no ownership check at all, letting any
 * authenticated user enumerate any other user's id/email/display_name/role/
 * email_verified/age_consent (IDOR). Ownership mismatches 404 (not 403), same
 * convention as GET /report/:reportId, so a probing request can't distinguish
 * "not yours" from "doesn't exist".
 */
router.get("/:id", verifyToken, async (req: AuthRequest & Request<{ id: string }>, res: Response<UserProfile | ApiError>) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await pool.query<User>(
      `SELECT id, firebase_uid, display_name, email, profile_image, role, email_verified, age_consent
       FROM usdusers WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0 || result.rows[0].firebase_uid !== req.userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      display_name: row.display_name,
      email: row.email,
      profile_image: row.profile_image,
      role: row.role,
      email_verified: row.email_verified,
      age_consent: row.age_consent,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      error: "Failed to fetch user",
      details: errorDetails(error),
    });
  }
});

/**
 * GET /user/email/:email
 * Returns the CALLER'S OWN profile — :email must match the authenticated
 * caller's own email. Same IDOR fix as GET /user/:id above: previously any
 * authenticated user could look up any other user's PII by email.
 */
router.get("/email/:email", verifyToken, async (req: AuthRequest & Request<{ email: string }>, res: Response<UserProfile | ApiError>) => {
  try {
    const { email } = req.params;

    const result = await pool.query<User>(
      `SELECT id, firebase_uid, display_name, email, profile_image, role, email_verified, age_consent
       FROM usdusers WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0 || result.rows[0].firebase_uid !== req.userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      display_name: row.display_name,
      email: row.email,
      profile_image: row.profile_image,
      role: row.role,
      email_verified: row.email_verified,
      age_consent: row.age_consent,
    });
  } catch (error) {
    console.error("Error fetching user by email:", error);
    res.status(500).json({
      error: "Failed to fetch user",
      details: errorDetails(error),
    });
  }
});

/**
 * POST /user
 * Creates (or updates) the CALLER'S OWN usdusers row. Used right after
 * Firebase client-side signup, when the frontend has a Firebase UID but no
 * DB row exists for it yet — i.e. before an app JWT can exist, so this
 * cannot require verifyToken the way every other route does.
 *
 * Auth: a Firebase ID token (Authorization: Bearer <idToken>), verified here
 * with firebaseAuth.verifyIdToken — the SAME check POST /auth/login uses.
 * uid/email/email_verified are ALWAYS derived from the verified token, NEVER
 * from the request body. This endpoint previously trusted a client-supplied
 * `email`/`role`/`email_verified` with no authentication at all, letting
 * anyone fabricate a "verified" account for an arbitrary email or overwrite
 * an existing user's row. firebase_uid is now stored on insert so a later
 * POST /auth/login resolves to this same row instead of relying on the
 * by-email relink fallback.
 */
router.post("/", async (req: Request<{}, UserProfile | ApiError, UpsertUserBody>, res: Response<UserProfile | ApiError>) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const idToken = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = await firebaseAuth.verifyIdToken(idToken, true);
    } catch {
      return res.status(401).json({ error: "Invalid or revoked Firebase token" });
    }

    const uid = decoded.uid;
    // Same NOT NULL + UNIQUE fallback auth.ts's /login uses when a token has
    // no email on it.
    const email = decoded.email ?? `${uid}@placeholder.firebase`;
    const emailVerified = decoded.email_verified ?? false;

    const { display_name, profile_image, auth_provider, provider_user_id, age_consent } =
      req.body ?? {};

    // Post-deactivation cooldown. If this email belongs to a deactivated row,
    // block re-use until the cooldown elapses; once it has, free the email off
    // the old (kept-for-records) row so the upsert below creates a fresh account.
    const prior = await pool.query<{
      id: number;
      is_active: boolean;
      deactivated_at: string | null;
    }>(
      `SELECT id, is_active, deactivated_at FROM usdusers WHERE email = $1`,
      [email],
    );
    const priorRow = prior.rows[0];
    if (priorRow && priorRow.is_active === false && priorRow.deactivated_at) {
      const eligibleAtMs =
        new Date(priorRow.deactivated_at).getTime() +
        REACTIVATION_COOLDOWN_HOURS * 60 * 60 * 1000;

      if (eligibleAtMs > Date.now()) {
        return res.status(403).json({
          error: "ACCOUNT_COOLDOWN",
          details: `This account was recently deactivated. You can register again after ${new Date(eligibleAtMs).toISOString()}.`,
        });
      }

      // Cooldown elapsed — release the email from the old row (kept for records)
      // so the INSERT below registers a brand-new account.
      await pool.query(`UPDATE usdusers SET email = $1 WHERE id = $2`, [
        `deleted+${priorRow.id}+${email}`,
        priorRow.id,
      ]);
    }

    // role is never client-writable (always 'user' — no authorization
    // anywhere reads this column today, but it must never become
    // attacker-controlled). email/email_verified/firebase_uid come from the
    // verified Firebase token above, never the request body. email_verified
    // only ratchets true->true; a later unverified token can't un-verify a
    // row that a prior verified token already confirmed.
    const result = await pool.query<User>(
      `INSERT INTO usdusers
         (firebase_uid, email, display_name, profile_image, auth_provider, role, email_verified, provider_user_id, age_consent, created_at, last_login)
       VALUES ($1, $2, $3, $4, $5, 'user', $6, $7, $8, NOW(), NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         firebase_uid      = COALESCE(usdusers.firebase_uid, EXCLUDED.firebase_uid),
         display_name      = COALESCE(EXCLUDED.display_name, usdusers.display_name),
         profile_image     = COALESCE(EXCLUDED.profile_image, usdusers.profile_image),
         email_verified    = EXCLUDED.email_verified OR usdusers.email_verified,
         provider_user_id  = COALESCE(EXCLUDED.provider_user_id, usdusers.provider_user_id),
         age_consent       = COALESCE(EXCLUDED.age_consent, usdusers.age_consent),
         last_login        = NOW()
       RETURNING id, display_name, email, profile_image, role, email_verified, age_consent`,
      [
        uid,
        email,
        display_name ?? null,
        profile_image ?? null,
        auth_provider ?? null,
        emailVerified,
        provider_user_id ?? null,
        age_consent ?? false,
      ]
    );

    const row = result.rows[0];
    res.status(200).json({
      id: row.id,
      display_name: row.display_name,
      email: row.email,
      profile_image: row.profile_image,
      role: row.role,
      email_verified: row.email_verified,
      age_consent: row.age_consent,
    });
  } catch (error) {
    console.error("Error upserting user:", error);
    res.status(500).json({
      error: "Failed to save user",
      details: errorDetails(error),
    });
  }
});

export default router;
