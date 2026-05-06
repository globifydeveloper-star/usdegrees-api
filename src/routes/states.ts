import { Router, Request, Response } from "express";
import { State } from "../types/search-details";
import pool from "../db/client";

const router = Router();

// GET /states
router.get("/", async (_req: Request, res: Response) => {
  try {
    console.log("Fetching states...");
    const { rows } = await pool.query<State>(
      "SELECT id, state_code, state_title FROM states ORDER BY state_title"
    );
    res.json(rows);
  } catch (err) {
    console.error("[/states] Error:", (err as Error).message);
    res.status(500).json({ error: "Internal server error", details: (err as Error).message });
  }
});

export default router;