/**
 * Central JWT secret loader. Every module that signs or verifies an app JWT
 * or report-download token must import JWT_SECRET from here — never read
 * process.env.JWT_SECRET directly with a string fallback. A missing secret
 * used to silently fall back to the literal "your_secret_key", which would
 * make every token forgeable if the env var were ever unset in production.
 * Failing at boot instead means a misconfigured deploy never goes live.
 */
const secret = process.env.JWT_SECRET;

if (!secret || secret.trim().length === 0) {
  throw new Error(
    "JWT_SECRET environment variable is not set. Refusing to start: without " +
      "it, app JWTs and report-download tokens cannot be safely signed.",
  );
}

export const JWT_SECRET = secret;
