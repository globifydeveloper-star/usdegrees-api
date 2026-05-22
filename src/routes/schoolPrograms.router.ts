// routes/schoolPrograms.router.ts
// Mount all three routes under /schools/:unitid/programs/
//
// Usage in your main app.ts:
//   import schoolProgramsRouter from "./routes/schoolPrograms.router";
//   app.use("/schools", schoolProgramsRouter);

import { Router } from "express";
import autocompleteRouter from "./schoollevelsearch/autocomplete";
import degreeLevelsRouter from "./schoollevelsearch/degreelevels";
import searchProgramsRouter from "./schoollevelsearch/searchPrograms";

const router = Router({ mergeParams: true });

// GET /schools/:unitid/programs/autocomplete?q=comp
router.use("/:unitid/programs/autocomplete", autocompleteRouter);

// GET /schools/:unitid/programs/degrees?title=Computer%20Science
router.use("/:unitid/programs/degrees", degreeLevelsRouter);

// GET /schools/:unitid/programs/search?title=Computer%20Science&credential_title=Bachelor's%20Degree
router.use("/:unitid/programs/search", searchProgramsRouter);

export default router;