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
export type RawEarningsFillMethod = Exclude<
  EarningsFillMethod,
  "user_reported"
> | null;

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

/**
 * The single latest grad_cohort row for a program, reporting whichever of
 * year_1/year_5/year_10 that row actually has (recency of cohort wins over
 * which horizon is populated — this is deliberately NOT the same resolution
 * as EarningsMetricResolved/EarningsResolved above, which lets each horizon
 * pick its own best cohort independently). Used for the compare page's
 * single "average salary" figure, which must stay tied to one row so it can
 * be labeled "Class of {cohort}" rather than presented as an unqualified
 * average of a metric that doesn't chronologically exist yet for that class.
 */
export interface EarningsLatestCohortValue {
  value: number | null;
  cohort: string;
  method: EarningsFillMethod;
}

/**
 * A single year_1 / year_5 / year_10 figure resolved across all grad_cohort
 * rows for a program, independent of whichever cohort backs the other two
 * metrics. `cohort` records which grad_cohort the value was pulled from.
 */
export interface EarningsMetricResolved {
  value: number | null;
  method: EarningsFillMethod;
  cohort: string;
}

/**
 * avg_salary is anchored to the same cohort-selection waterfall used for
 * year_5 (there is no separate avg_salary_method column in the source
 * table). `basis_is_estimated` is true when no cohort had a user_reported
 * year_5 and the anchor fell back to interpolated/extrapolated/low_confidence.
 */
export interface EarningsAvgSalaryResolved {
  value: number | null;
  cohort: string;
  basis: "year_5";
  basis_is_estimated: boolean;
}

/**
 * Per-metric, cohort-aware resolution of a program's earnings across every
 * grad_cohort row on file — see earnings.service.ts#getEarningsForProgram.
 *
 * Each of year_1/year_5/year_10 is resolved independently: the most recent
 * cohort with a user_reported value wins; failing that, the most recent
 * interpolated/extrapolated cohort; failing that, the most recent
 * low_confidence cohort; null if nothing usable exists anywhere.
 *
 * `skipped_future` / `skipped_no_anchor` are never selected (their value is
 * always null in the source data) but are surfaced as the method on the
 * per-metric null case is not tracked here — callers that need to explain
 * *why* a metric is null should re-query method columns directly. In UI
 * terms: `skipped_future` means this cohort+horizon combination can only
 * ever be filled by a *newer* cohort (the horizon hasn't chronologically
 * elapsed yet); `skipped_no_anchor` means the horizon has elapsed but the
 * source hasn't published it in the current data vintage yet, so it may
 * still resolve on a future refresh of the *same* cohort.
 */
export interface EarningsResolved {
  year_1: EarningsMetricResolved | null;
  year_5: EarningsMetricResolved | null;
  year_10: EarningsMetricResolved | null;
  avg_salary: EarningsAvgSalaryResolved | null;
}
