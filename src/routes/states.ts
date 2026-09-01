import { Router, Request, Response } from "express";
import { State } from "../types/search-details";
import pool from "../db/client";

/**
 * 50 states + DC + PR (52), used only if the DB query fails.
 * Field names are state_code / state_title — the frontend depends on these;
 * do NOT rename to code/name.
 */
const FALLBACK_STATES: State[] = [
  { id: 1, state_code: "AL", state_title: "Alabama" },
  { id: 2, state_code: "AK", state_title: "Alaska" },
  { id: 3, state_code: "AZ", state_title: "Arizona" },
  { id: 4, state_code: "AR", state_title: "Arkansas" },
  { id: 5, state_code: "CA", state_title: "California" },
  { id: 6, state_code: "CO", state_title: "Colorado" },
  { id: 7, state_code: "CT", state_title: "Connecticut" },
  { id: 8, state_code: "DE", state_title: "Delaware" },
  { id: 9, state_code: "FL", state_title: "Florida" },
  { id: 10, state_code: "GA", state_title: "Georgia" },
  { id: 11, state_code: "HI", state_title: "Hawaii" },
  { id: 12, state_code: "ID", state_title: "Idaho" },
  { id: 13, state_code: "IL", state_title: "Illinois" },
  { id: 14, state_code: "IN", state_title: "Indiana" },
  { id: 15, state_code: "IA", state_title: "Iowa" },
  { id: 16, state_code: "KS", state_title: "Kansas" },
  { id: 17, state_code: "KY", state_title: "Kentucky" },
  { id: 18, state_code: "LA", state_title: "Louisiana" },
  { id: 19, state_code: "ME", state_title: "Maine" },
  { id: 20, state_code: "MD", state_title: "Maryland" },
  { id: 21, state_code: "MA", state_title: "Massachusetts" },
  { id: 22, state_code: "MI", state_title: "Michigan" },
  { id: 23, state_code: "MN", state_title: "Minnesota" },
  { id: 24, state_code: "MS", state_title: "Mississippi" },
  { id: 25, state_code: "MO", state_title: "Missouri" },
  { id: 26, state_code: "MT", state_title: "Montana" },
  { id: 27, state_code: "NE", state_title: "Nebraska" },
  { id: 28, state_code: "NV", state_title: "Nevada" },
  { id: 29, state_code: "NH", state_title: "New Hampshire" },
  { id: 30, state_code: "NJ", state_title: "New Jersey" },
  { id: 31, state_code: "NM", state_title: "New Mexico" },
  { id: 32, state_code: "NY", state_title: "New York" },
  { id: 33, state_code: "NC", state_title: "North Carolina" },
  { id: 34, state_code: "ND", state_title: "North Dakota" },
  { id: 35, state_code: "OH", state_title: "Ohio" },
  { id: 36, state_code: "OK", state_title: "Oklahoma" },
  { id: 37, state_code: "OR", state_title: "Oregon" },
  { id: 38, state_code: "PA", state_title: "Pennsylvania" },
  { id: 39, state_code: "RI", state_title: "Rhode Island" },
  { id: 40, state_code: "SC", state_title: "South Carolina" },
  { id: 41, state_code: "SD", state_title: "South Dakota" },
  { id: 42, state_code: "TN", state_title: "Tennessee" },
  { id: 43, state_code: "TX", state_title: "Texas" },
  { id: 44, state_code: "UT", state_title: "Utah" },
  { id: 45, state_code: "VT", state_title: "Vermont" },
  { id: 46, state_code: "VA", state_title: "Virginia" },
  { id: 47, state_code: "WA", state_title: "Washington" },
  { id: 48, state_code: "WV", state_title: "West Virginia" },
  { id: 49, state_code: "WI", state_title: "Wisconsin" },
  { id: 50, state_code: "WY", state_title: "Wyoming" },
  { id: 51, state_code: "DC", state_title: "District of Columbia" },
  { id: 52, state_code: "PR", state_title: "Puerto Rico" },
];

const router = Router();

let statesCache: State[] | null = null;

/**
 * GET /states
 * Returns [{ id, state_code, state_title }]. Only rows with a non-empty
 * state_code AND state_title are returned, so the frontend never sees an
 * undefined title/code.
 */
router.get("/", async (_req: Request, res: Response<State[]>) => {
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  if (statesCache && statesCache.length > 0) {
    return res.json(statesCache);
  }
  try {
    const { rows } = await pool.query<State>(
      `SELECT id, state_code, state_title
         FROM states
        WHERE state_code IS NOT NULL AND btrim(state_code) <> ''
          AND state_title IS NOT NULL AND btrim(state_title) <> ''
        ORDER BY state_title`,
    );
    if (rows && rows.length > 0) {
      statesCache = rows;
      return res.json(rows);
    }
    return res.json(FALLBACK_STATES);
  } catch (err) {
    console.warn(
      "[/states] DB query failed, returning fallback states:",
      (err as Error).message,
    );
    return res.json(FALLBACK_STATES);
  }
});

export default router;
