import { Router, Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { jwtVerify, createRemoteJWKSet, JWTPayload } from "jose";
import { DecodedIdToken } from "firebase-admin/auth";
import { firebaseAuth } from "../config/firebase";
import pool from "../db/client";
import { verifyToken } from "../middleware/auth";
import { User, UserProfile, ApiError, AuthRequest } from "../types/user";

const router = Router();
const SECRET = process.env.JWT_SECRET || "your_secret_key";
const APP_JWT_TTL = process.env.APP_JWT_TTL || "30m";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
// createRemoteJWKSet caches the JWKS response internally and re-fetches
// on a `kid` cache miss, so no separate caching layer is needed here.
const appleJwks = createRemoteJWKSet(new URL(`${APPLE_ISSUER}/auth/keys`));

const USER_COLUMNS =
  "id, firebase_uid, email, display_name, profile_image, role, email_verified, is_active, age_consent";

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
    age_consent: user.age_consent,
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
        // Silent by default until now — this reassigns an existing row's
        // identity purely off an email string match, no other verification.
        // Logged explicitly so a wrong reassignment (e.g. two different
        // people who both once used the same address) is traceable after
        // the fact rather than discovered later as "my data disappeared".
        if (user) {
          console.warn(
            `[auth/login] relinked usdusers.id=${user.id} (email="${email}") to firebase_uid=${uid}`,
          );
        }
      }

      // 3. Reject soft-deleted accounts.
      if (user && user.is_active === false) {
        return res.status(403).json({ error: "This account has been deleted" });
      }

      // 4. Idempotent upsert keyed on firebase_uid: insert on first login,
      //    otherwise mirror email/email_verified and bump last_login. Profile
      //    fields (display_name, profile_image) are only set on insert so we
      //    never clobber edits the user made via PATCH /profile.
      //
      //    This is atomic for the firebase_uid identity (ON CONFLICT
      //    serializes concurrent logins for the same UID at the DB level —
      //    no separate check-then-write race there). The remaining failure
      //    mode is a DIFFERENT row already owning `emailValue` (e.g. an
      //    unrelated signup, or a stale duplicate) — that still violates
      //    usdusers_email_key even though the conflict target here is
      //    firebase_uid, not email. Caught below instead of bubbling to the
      //    generic 500 handler, since silently overwriting a stranger's
      //    email onto this row would be an account-hijack bug, not a fix.
      try {
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
      } catch (err) {
        const pgErr = err as { code?: string; constraint?: string };
        if (
          pgErr.code === "23505" &&
          pgErr.constraint === "usdusers_email_key"
        ) {
          const conflict = await pool.query<{
            id: number;
            firebase_uid: string | null;
          }>(
            `SELECT id, firebase_uid FROM usdusers WHERE email = $1 AND firebase_uid IS DISTINCT FROM $2`,
            [emailValue, uid],
          );
          console.error(
            `[auth/login] 409 — email collision: uid=${uid} tried to claim email="${emailValue}", ` +
              `already held by usdusers.id=${conflict.rows[0]?.id ?? "unknown"} ` +
              `(firebase_uid=${conflict.rows[0]?.firebase_uid ?? "null"})`,
          );
          return res.status(409).json({
            error:
              "This email address is already associated with a different account. Please contact support to resolve this before signing in again.",
          });
        }
        throw err;
      }

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
 * POST /auth/apple
 * Verifies an Apple identity token directly against Apple's JWKS — independent
 * of the Firebase-based /auth/login flow — and mints the same kind of app JWT.
 *
 * Body:   { id_token: string }   (Apple identity token from Sign in with Apple)
 * Returns: { token: string, user: UserProfile }
 *
 * Unlike /auth/login this returns the full user object inline, since there's
 * no separate Firebase-driven /auth/me sync call in the Apple flow.
 */
router.post(
  "/apple",
  async (
    req: Request<
      {},
      { token: string; user: UserProfile } | ApiError,
      { id_token?: string; full_name?: string }
    >,
    res: Response<{ token: string; user: UserProfile } | ApiError>,
  ) => {
    try {
      const idToken = req.body?.id_token;

      if (!idToken) {
        return res.status(400).json({ error: "id_token is required" });
      }

      if (!APPLE_CLIENT_ID) {
        console.error("[auth/apple] 500 — APPLE_CLIENT_ID is not configured");
        return res
          .status(500)
          .json({ error: "Apple sign-in is not configured" });
      }

      let payload: JWTPayload;
      try {
        ({ payload } = await jwtVerify(idToken, appleJwks, {
          issuer: APPLE_ISSUER,
          audience: APPLE_CLIENT_ID,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[auth/apple] 401 — jwtVerify failed: ${message}`);
        return res
          .status(401)
          .json({ error: "Invalid or expired Apple token" });
      }

      const sub = payload.sub;
      if (!sub) {
        return res.status(401).json({ error: "Invalid Apple token payload" });
      }

      const email = typeof payload.email === "string" ? payload.email : null;
      // Apple encodes this as a boolean or a stringified boolean depending on
      // token version, so normalize both.
      const emailVerified =
        payload.email_verified === true || payload.email_verified === "true";

      const emailValue = email ?? `${sub}@privaterelay.appleid.com`;
      // Apple only sends full_name on the very first authorization for a given
      // sub — the frontend passes it through here so we can seed display_name
      // at account creation. It's ignored below on every subsequent login
      // (the INSERT...ON CONFLICT never overwrites display_name), so there's
      // no need to gate this on "is this a new user" — it just never matters
      // again once the row exists.
      const fullName = req.body?.full_name?.trim() || null;
      const displayName =
        fullName || (email ? email.split("@")[0] : "New User");

      // Namespace the Apple `sub` into firebase_uid so this row keys the same
      // way Firebase-issued users do — verifyToken and GET /auth/me look users
      // up by firebase_uid = JWT `sub`, and reusing that column here avoids
      // touching either of them for a second identity source.
      const appleUid = `apple:${sub}`;

      // 1. Find the row by provider_user_id (Apple's stable subject).
      let result = await pool.query<User>(
        `SELECT ${USER_COLUMNS} FROM usdusers WHERE provider_user_id = $1 AND auth_provider = 'apple'`,
        [sub],
      );
      let user = result.rows[0];

      // 2. Re-link by email — covers an existing account (e.g. Google or
      //    credentials) signing in with Apple for the first time. Point it at
      //    the Apple identity the same way /auth/login re-links Firebase
      //    providers onto a shared email.
      if (!user && email) {
        const relinked = await pool.query<User>(
          `UPDATE usdusers
              SET firebase_uid = $1, provider_user_id = $2, last_login = NOW()
            WHERE email = $3
          RETURNING ${USER_COLUMNS}`,
          [appleUid, sub, email],
        );
        user = relinked.rows[0];
      }

      if (user && user.is_active === false) {
        return res.status(403).json({ error: "This account has been deleted" });
      }

      // 3. Idempotent upsert keyed on firebase_uid (the column with the
      //    UNIQUE constraint — see firebase_auth.sql): insert on first
      //    sign-in, otherwise mirror email/email_verified and bump
      //    last_login. Profile fields are only set on insert so we never
      //    clobber PATCH edits.
      const upserted = await pool.query<User>(
        `INSERT INTO usdusers
           (firebase_uid, provider_user_id, email, display_name, profile_image,
            email_verified, auth_provider, role, is_active, created_at, last_login)
         VALUES ($1, $2, $3, $4, NULL, $5, 'apple', 'student', true, NOW(), NOW())
         ON CONFLICT (firebase_uid) DO UPDATE SET
           email             = EXCLUDED.email,
           email_verified    = EXCLUDED.email_verified,
           provider_user_id  = EXCLUDED.provider_user_id,
           last_login        = NOW()
         RETURNING ${USER_COLUMNS}`,
        [appleUid, sub, emailValue, displayName, emailVerified],
      );
      user = upserted.rows[0];

      const token = jwt.sign({ sub: user.firebase_uid }, SECRET, {
        expiresIn: APP_JWT_TTL,
      } as SignOptions);

      return res.json({ token, user: toProfile(user) });
    } catch (error) {
      console.error("[auth/apple] 500 — unexpected error:", error);
      return res.status(500).json({
        error: "Apple sign-in failed",
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
