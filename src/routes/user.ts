import { Router, Request, Response } from "express";
import pool from "../db/client";
import { User, UserProfile, UpsertUserBody, ApiError } from "../types/user";
import { REACTIVATION_COOLDOWN_HOURS } from "./profile";

const router = Router();

/**
 * GET /user/:id
 * Returns full user profile by ID
 */
router.get("/:id", async (req: Request<{ id: string }>, res: Response<UserProfile | ApiError>) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await pool.query<User>(
      `SELECT id, display_name, email, profile_image, role, email_verified, age_consent
       FROM usdusers WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
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
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /user/email/:email
 * Returns user profile by email address
 */
router.get("/email/:email", async (req: Request<{ email: string }>, res: Response<UserProfile | ApiError>) => {
  try {
    const { email } = req.params;

    const result = await pool.query<User>(
      `SELECT id, display_name, email, profile_image, role, email_verified, age_consent
       FROM usdusers WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
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
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /user
 * Upsert user — inserts on first login, updates last_login and profile on subsequent logins.
 * Keyed on email + auth_provider.
 */
router.post("/", async (req: Request<{}, UserProfile | ApiError, UpsertUserBody>, res: Response<UserProfile | ApiError>) => {
  try {
    const { email, display_name, profile_image, auth_provider, role, email_verified, provider_user_id, age_consent } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

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

    const result = await pool.query<User>(
      `INSERT INTO usdusers
         (email, display_name, profile_image, auth_provider, role, email_verified, provider_user_id, age_consent, created_at, last_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         display_name     = COALESCE(EXCLUDED.display_name, usdusers.display_name),
         profile_image    = COALESCE(EXCLUDED.profile_image, usdusers.profile_image),
         email_verified   = COALESCE(EXCLUDED.email_verified, usdusers.email_verified),
         provider_user_id = COALESCE(EXCLUDED.provider_user_id, usdusers.provider_user_id),
         age_consent       = COALESCE(EXCLUDED.age_consent, usdusers.age_consent),
         last_login       = NOW()
       RETURNING id, display_name, email, profile_image, role, email_verified, age_consent`,
      [
        email,
        display_name ?? null,
        profile_image ?? null,
        auth_provider ?? null,
        role ?? "user",
        email_verified ?? false,
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
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
