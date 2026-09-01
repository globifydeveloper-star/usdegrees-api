import { Router, Request, Response } from "express";
import CREDENTIAL_LEVELS from "../constants/credentials";
const router = Router();

// GET /credentials
router.get("/", (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  res.json(CREDENTIAL_LEVELS);
});

export default router;