import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import pool from "../db/client";
import { JWT_SECRET } from "../config/jwt";

const router = Router();

interface ApplyClickBody {
  university_id?: unknown;
  cip_code?: unknown;
  degree?: unknown;
  credential_level?: unknown;
  credential_title?: unknown;
  school_url?: unknown;
  clicked_at?: unknown;
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function optionalInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function tryResolveUserId(req: Request): Promise<number | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ") || !authHeader.slice(7).trim()) {
    throw new Error("Malformed Authorization header");
  }

  try {
    const payload = jwt.verify(authHeader.slice(7).trim(), JWT_SECRET) as {
      sub?: string;
    };
    if (!payload.sub) return null;

    const result = await pool.query<{ id: number; is_active: boolean }>(
      "SELECT id, is_active FROM usdusers WHERE firebase_uid = $1",
      [payload.sub],
    );
    if (result.rows.length === 0 || result.rows[0].is_active === false) return null;
    return result.rows[0].id;
  } catch (error) {
    if (error instanceof Error && error.message === "Malformed Authorization header") {
      throw error;
    }
    return null;
  }
}

router.post("/apply-click", async (req: Request, res: Response) => {
  try {
    const body = req.body as ApplyClickBody;
    const userId = await tryResolveUserId(req);
    const clickedAt = optionalString(body.clicked_at);

    await pool.query(
      `INSERT INTO usd_apply_clicks
        (user_id, university_id, cip_code, degree, credential_level,
         credential_title, school_url, clicked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
         COALESCE($8::timestamptz, CURRENT_TIMESTAMP))`,
      [
        userId,
        optionalString(body.university_id),
        optionalString(body.cip_code),
        optionalString(body.degree),
        optionalInteger(body.credential_level),
        optionalString(body.credential_title),
        optionalString(body.school_url),
        clickedAt,
      ],
    );

    return res.status(201).json({
      status: "success",
      message: "Apply click tracked successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Malformed Authorization header") {
      return res.status(401).json({ error: "Malformed Authorization header" });
    }
    console.error("[analytics/apply-click] 500 - insert failed:", error);
    return res.status(500).json({ error: "Failed to track apply click" });
  }
});

export default router;