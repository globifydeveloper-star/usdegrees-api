import { Router, Request, Response } from "express";
import CREDENTIAL_LEVELS from "../constants/credentials";
const router = Router();

// GET /credentials
router.get("/", (_req: Request, res: Response) => {
  res.json(CREDENTIAL_LEVELS);
});

export default router;