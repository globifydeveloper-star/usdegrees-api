import { Router, Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { DecodedIdToken } from "firebase-admin/auth";
import { firebaseAuth } from "../config/firebase";
import pool from "../db/client";
import { verifyToken } from "../middleware/auth";
import { User, UserProfile, ApiError, AuthRequest } from "../types/user";

const router = Router();
const SECRET = process.env.JWT_SECRET || "your_secret_key";
const APP_JWT_TTL = process.env.APP_JWT_TTL || "30m";

const USER_COLUMNS =
  "id, firebase_uid, email, display_name, profile_image, role, email_verified, is_active";

/**
 * Map Firebase's `firebase.sign_in_provider` onto an auth_provider value the
 * usdusers CHECK constraint accepts (google | apple | microsoft | credentials).
 * Email/password and anything unrecognized fall back to 'credentials'.
 */
function mapAuthProvider(signInProvider?: string): string {
  switch (signInProvider) {
    case "google.com":
      return "google";
    case "apple.com":
      return "apple";
    case "microsoft.com":
      return "microsoft";
    default:
      return "credentials";
  }
}

function toProfile(user: User): UserProfile {
  return {
    id: user.id,
    display_name: user.display_name,
    email: user.email,
    profile_image: user.profile_image,
    role: user.role,
    email_verified: user.email_verified,
  };
}

/**
 * POST /auth/login
 * Token exchange: verifies a Firebase ID token and mints a short-lived app JWT.
 *
 * Body:   { idToken: string }   (Firebase ID token from the frontend)
 * Returns: { token: string }    (app JWT, sub = Firebase UID)
 *
 * This is the ONLY endpoint that accepts a Firebase token. Everything else
 * uses the app JWT via the verifyToken middleware.
 */
router.post(
  "/login",
  async (
    req: Request<{}, { token: string } | ApiError, { idToken?: string }>,
    res: Response<{ token: string } | ApiError>,
  ) => {
    console.log("[auth/login] hit", {
      hasIdToken: !!req.body?.idToken,
      from: req.ip,
    });
    try {
      // req.body can be undefined in Express 5 when no JSON body is sent.
      const idToken = req.body?.idToken;

      if (!idToken) {
        console.warn("[auth/login] 400 — missing idToken in body");
        return res.status(400).json({ error: "idToken is required" });
      }

      // Verify the Firebase token with the revoked-check enabled.
      let decoded: DecodedIdToken;
      try {
        decoded = await firebaseAuth.verifyIdToken(idToken, true);
      } catch (err) {
        const code = (err as { code?: string })?.code ?? "unknown";
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[auth/login] 401 — verifyIdToken failed (code=${code}): ${message}`,
        );
        return res
          .status(401)
          .json({ error: "Invalid or revoked Firebase token" });
      }

      console.log(`[auth/login] token verified for uid=${decoded.uid}`);

      const uid = decoded.uid;
      const email = decoded.email ?? null;
      const emailVerified = decoded.email_verified ?? false;

      // Fallbacks for NOT NULL columns the token may not supply.
      // email is NOT NULL + UNIQUE; if a token ever lacks one, key a placeholder
      // off the uid so we never insert null or collide.
      const emailValue = email ?? `${uid}@placeholder.firebase`;
      const displayName =
        decoded.name || (email ? email.split("@")[0] : null) || "New User";

      // auth_provider has a CHECK constraint: google | apple | microsoft |
      // credentials. Map Firebase's sign_in_provider onto an allowed value.
      const authProvider = mapAuthProvider(decoded.firebase?.sign_in_provider);

      // 1. Find the row by Firebase UID.
      let result = await pool.query<User>(
        `SELECT ${USER_COLUMNS} FROM usdusers WHERE firebase_uid = $1`,
        [uid],
      );
      let user = result.rows[0];

      // 2. Re-link by email. Covers two cases:
      //    (a) migrated bcrypt users that exist by email with no UID yet, and
      //    (b) a Firebase account that was deleted and recreated for the same
      //        email (new UID) — e.g. re-registration after deactivation.
      //    Either way, point the existing row at the current verified UID rather
      //    than letting the INSERT below collide on the email UNIQUE constraint.
      if (!user && email) {
        const relinked = await pool.query<User>(
          `UPDATE usdusers
              SET firebase_uid = $1, last_login = NOW()
            WHERE email = $2
          RETURNING ${USER_COLUMNS}`,
          [uid, email],
        );
        user = relinked.rows[0];
      }

      // 3. Reject soft-deleted accounts.
      if (user && user.is_active === false) {
        return res.status(403).json({ error: "This account has been deleted" });
      }

      // 4. Idempotent upsert keyed on firebase_uid: insert on first login,
      //    otherwise mirror email/email_verified and bump last_login. Profile
      //    fields (display_name, profile_image) are only set on insert so we
      //    never clobber edits the user made via PATCH /profile.
      const upserted = await pool.query<User>(
        `INSERT INTO usdusers
           (firebase_uid, email, display_name, profile_image, email_verified,
            auth_provider, role, is_active, created_at, last_login)
         VALUES ($1, $2, $3, $4, $5, $6, 'student', true, NOW(), NOW())
         ON CONFLICT (firebase_uid) DO UPDATE SET
           email          = EXCLUDED.email,
           email_verified = EXCLUDED.email_verified,
           last_login     = NOW()
         RETURNING ${USER_COLUMNS}`,
        [
          uid,
          emailValue,
          displayName,
          decoded.picture ?? null,
          emailVerified,
          authProvider,
        ],
      );
      user = upserted.rows[0];

      const token = jwt.sign({ sub: uid }, SECRET, {
        expiresIn: APP_JWT_TTL,
      } as SignOptions);
      console.log(`[auth/login] 200 — app JWT issued for uid=${uid}`);
      return res.json({ token });
    } catch (error) {
      console.error("[auth/login] 500 — unexpected error:", error);
      return res.status(500).json({
        error: "Login failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * GET /auth/me
 * Alias of GET /profile — returns the current user's profile from the app JWT.
 * Kept for frontend backward-compatibility.
 */
router.get(
  "/me",
  verifyToken,
  async (req: AuthRequest, res: Response<UserProfile | ApiError>) => {
    try {
      const result = await pool.query<User>(
        `SELECT ${USER_COLUMNS} FROM usdusers WHERE firebase_uid = $1`,
        [req.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(toProfile(result.rows[0]));
    } catch (error) {
      console.error("Fetch me error:", error);
      res.status(500).json({
        error: "Failed to retrieve user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
