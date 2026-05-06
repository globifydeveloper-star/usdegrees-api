import { Router, Request, Response } from "express";
import { SearchResult } from "../types/search-details";
import pool from "../db/client";


const router = Router();

// GET /search?credential_title=&state=
// Returns full program list with school info
router.get("/", async (req: Request, res: Response) => {
  const { credential_title, state, title } = req.query as Record<string, string>;

  const params: string[] = [];

  let sql = `
    SELECT p.id, p.title, p.school_name, p.credential_title, s.state
    FROM programs p
    JOIN schools s ON p.unitid = s.unitid
    WHERE 1=1
  `;

  // 🔹 Credential filter
  if (credential_title) {
    params.push(credential_title);
    sql += ` AND p.credential_title = $${params.length}`;
  }

  // 🔹 State filter
  if (state) {
    params.push(state);
    sql += ` AND s.state = $${params.length}`;
  }

  // 🔹 Course title search (partial match)
  if (title) {
    params.push(`%${title}%`);
    sql += ` AND LOWER(p.title) LIKE LOWER($${params.length})`;
  }

  // 🔹 Sorting + limit
  sql += ` ORDER BY p.title ASC LIMIT 50`;

  try {
    const { rows } = await pool.query<SearchResult>(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("[/search] Error:", (err as Error).message);
    res.status(500).json({
      error: "Internal server error",
      details: (err as Error).message
    });
  }
});

export default router;