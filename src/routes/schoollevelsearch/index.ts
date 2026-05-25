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

const router = Router({ mergeParams: true });

// GET /schools/:unitid/programs/autocomplete?q=comp
router.use("/:unitid/programs/autocomplete", autocompleteRouter);

// GET /schools/:unitid/programs/degrees?title=Computer%20Science
router.use("/:unitid/programs/degrees", degreeLevelsRouter);

// GET /schools/:unitid/programs/search?title=Computer%20Science&credential_title=Bachelor's%20Degree
router.use("/:unitid/programs/search", searchProgramsRouter);

export default router;
