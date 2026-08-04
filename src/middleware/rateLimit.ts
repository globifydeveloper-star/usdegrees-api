import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * Auth endpoints (login / token exchange) have no other abuse control —
 * limit by IP since the caller isn't authenticated yet.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

/**
 * Report generation triggers a real Gemini API call plus a headless-Chrome
 * PDF render per request — both cost money and compute. Limited per
 * authenticated user (req.userId, set by verifyToken) so one account can't
 * loop this to rack up unlimited Gemini/compute cost; falls back to IP for
 * any request that somehow reaches this without a resolved user.
 */
export const reportGenerationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req as { userId?: string }).userId || ipKeyGenerator(req.ip || "unknown"),
  message: {
    error: "Report generation limit reached. Please try again later.",
  },
});
