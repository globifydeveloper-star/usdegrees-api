import { Router, Request, Response } from "express";
import { DEGREE_LEVELS } from "../constants/degreeLevels";

const router = Router();

/**
 * GET /degree-levels
 * Reference data (no auth). Returns the 8 canonical degree-level strings in
 * canonical order — the single source the frontend dropdown reads.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json(DEGREE_LEVELS);
});

export default router;
