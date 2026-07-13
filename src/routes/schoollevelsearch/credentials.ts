// routes/schoollevelsearch/credentials.ts
// GET /schools/:unitid/programs/credentials
//
// Returns the distinct credential levels that actually exist at a school,
// used to populate the credential-level dropdown for "Search All Programs".

import { Router, Request, Response } from "express";
import pool from "../../db/client";
import { CredentialRow, CredentialsResponse } from "../../types/schoolPrograms";

const router = Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response) => {
  const unitidParam = req.params.unitid;
  if (Array.isArray(unitidParam)) {
    return res.status(400).json({ error: "Invalid unitid parameter" });
  }
  const unitid = parseInt(unitidParam, 10);

  if (isNaN(unitid)) {
    return res.status(400).json({ error: "Invalid school id" });
  }

  try {
    const sql = `
      SELECT DISTINCT
        credential_title,
        credential_level
      FROM   programs
      WHERE  unitid = $1
      ORDER  BY credential_level ASC
    `;

    const { rows } = await pool.query<CredentialRow>(sql, [unitid]);

    const response: CredentialsResponse = { credentials: rows };
    return res.json(response);
  } catch (err) {
    console.error("[credentials] Error:", (err as Error).message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
