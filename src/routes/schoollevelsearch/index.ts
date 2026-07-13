// routes/schoollevelsearch/index.ts
// Mount all three routes under /schools/:unitid/programs/
//
// Usage in your main app.ts:
//   import schoolLevelSearchRouter from "./routes/schoollevelsearch";
//   app.use("/schools", schoolLevelSearchRouter);

import { Router } from "express";
import autocompleteRouter from "./autocomplete";
import degreeLevelsRouter from "./degreelevels";
import searchProgramsRouter from "./searchPrograms";
import allProgramsRouter from "./allPrograms";
import credentialsRouter from "./credentials";

const router = Router({ mergeParams: true });

// GET /schools/:unitid/programs/autocomplete?q=comp
router.use("/:unitid/programs/autocomplete", autocompleteRouter);

// GET /schools/:unitid/programs/degrees?title=Computer%20Science
router.use("/:unitid/programs/degrees", degreeLevelsRouter);

// GET /schools/:unitid/programs/search?title=Computer%20Science&credential_title=Bachelor's%20Degree
router.use("/:unitid/programs/search", searchProgramsRouter);

// GET /schools/:unitid/programs/credentials
router.use("/:unitid/programs/credentials", credentialsRouter);

// GET /schools/:unitid/programs?q=comp&level=Undergraduate&limit=20
// Must be registered after the more specific /programs/* routes above,
// since router.use matches by path prefix.
router.use("/:unitid/programs", allProgramsRouter);

export default router;
