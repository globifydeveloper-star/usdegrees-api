// src/types/earnings.ts
//
// Shared earnings types sourced from `earnings_against_courses_merged`.
// This is the canonical definition of `EarningsFillMethod` — the frontend
// should mirror these exact string values for tooltip/badge mapping.

/**
 * How a given year_1 / year_5 / year_10 earnings figure was derived.
 *
 * - user_reported     — raw value as reported, no filling applied.
 * - interpolated       — filled using anchor points on both sides.
 * - extrapolated       — filled using an anchor point on one side only.
 * - low_confidence     — filled, but the anchor(s) used are considered weak.
 * - skipped_future     — no value: the cohort year hasn't happened yet.
 * - skipped_no_anchor  — no value: no usable anchor existed to fill from.
 *
 * `skipped_future` and `skipped_no_anchor` always pair with a null year
 * value — the method is still returned so the client can render the
 * correct badge/tooltip instead of just hiding the field.
 *
 * The DB stores `user_reported` as a NULL method column (raw/unfilled row);
 * the API layer normalizes that NULL to the literal "user_reported" string
 * below so callers never have to special-case null vs. the enum.
 */
export type EarningsFillMethod =
  | "user_reported"
  | "interpolated"
  | "extrapolated"
  | "low_confidence"
  | "skipped_future"
  | "skipped_no_anchor";

/** Raw method column value as stored in earnings_against_courses_merged (null = user_reported). */
export type RawEarningsFillMethod = Exclude<EarningsFillMethod, "user_reported"> | null;

/** Normalizes a raw DB method column to the public EarningsFillMethod enum. */
export function normalizeEarningsFillMethod(
  raw: string | null | undefined,
): EarningsFillMethod {
  return (raw as EarningsFillMethod | null | undefined) ?? "user_reported";
}

export interface EarningsYearValue {
  value: number | null;
  method: EarningsFillMethod;
}
