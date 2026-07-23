/**
 * earnings.service.ts
 *
 * Per-metric, cohort-aware resolution of a program's earnings across every
 * grad_cohort row in earnings_against_courses_merged. A single grad_cohort
 * row does not represent "the" earnings picture for a program — newer
 * cohorts only have year_1 populated, older cohorts have all three — so
 * year_1/year_5/year_10 (and avg_salary) are each resolved independently
 * against the best cohort available for that specific metric.
 */

import pool from "../db/client";
import {
  EarningsAvgSalaryResolved,
  EarningsFillMethod,
  EarningsMetricResolved,
  EarningsResolved,
  normalizeEarningsFillMethod,
} from "../types/earnings";

export interface EarningsCohortRow {
  grad_cohort: string;
  year_1: number | string | null;
  year_5: number | string | null;
  year_10: number | string | null;
  year_1_method: string | null;
  year_5_method: string | null;
  year_10_method: string | null;
  avg_salary: number | string | null;
}

function safeNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Cohorts sorted most-recent-first. grad_cohort '0000' is the source's
 * unknown/aggregate placeholder, not a real class year, so it is treated as
 * lowest priority regardless of string ordering (it sorts last here anyway
 * since it's numerically 0 and every real cohort is a positive year).
 */
export function sortCohortsDescending(
  rows: EarningsCohortRow[],
): EarningsCohortRow[] {
  return [...rows].sort(
    (a, b) => Number(b.grad_cohort) - Number(a.grad_cohort),
  );
}

const SKIPPED_METHODS: EarningsFillMethod[] = [
  "skipped_future",
  "skipped_no_anchor",
];

/**
 * Recency-first: the most recent cohort with any usable (non-skipped) value
 * wins, regardless of whether that value is reported or generated. Method
 * quality is surfaced honestly via the returned `method`, not used to
 * override a fresher cohort. Rows are assumed pre-sorted descending.
 */
export function pickBestCohort(
  rowsDescending: EarningsCohortRow[],
  methodKey: "year_1_method" | "year_5_method" | "year_10_method",
): { row: EarningsCohortRow; method: EarningsFillMethod } | null {
  const methodOf = (row: EarningsCohortRow) =>
    normalizeEarningsFillMethod(row[methodKey]);

  const usable = rowsDescending.find(
    (row) => !SKIPPED_METHODS.includes(methodOf(row)),
  );
  if (!usable) return null;

  return { row: usable, method: methodOf(usable) };
}

export function resolveMetric(
  rowsDescending: EarningsCohortRow[],
  valueKey: "year_1" | "year_5" | "year_10",
  methodKey: "year_1_method" | "year_5_method" | "year_10_method",
): EarningsMetricResolved | null {
  const best = pickBestCohort(rowsDescending, methodKey);
  if (!best) return null;
  return {
    value: safeNum(best.row[valueKey]),
    method: best.method,
    cohort: best.row.grad_cohort,
  };
}

/**
 * avg_salary rides the same recency-first year_5 resolution as resolveMetric
 * (there is no separate avg_salary_method column). `basis_is_estimated`
 * flags when the winning cohort's year_5 wasn't user_reported.
 */
export function resolveAvgSalary(
  rowsDescending: EarningsCohortRow[],
): EarningsAvgSalaryResolved | null {
  const best = pickBestCohort(rowsDescending, "year_5_method");
  if (!best) return null;
  return {
    value: safeNum(best.row.avg_salary),
    cohort: best.row.grad_cohort,
    basis: "year_5",
    basis_is_estimated: best.method !== "user_reported",
  };
}

/**
 * Resolves year_1 / year_5 / year_10 / avg_salary for one (unitid, cip_code,
 * credential_level) program across all grad_cohort rows on file. Never
 * hardcodes a cohort year — it re-derives the best cohort per metric from
 * whatever data is currently ingested, so it self-advances as new
 * PSEO/Scorecard vintages land.
 */
export async function getEarningsForProgram(
  unitid: number,
  cipCode: string,
  credentialLevel: number,
): Promise<EarningsResolved> {
  const { rows } = await pool.query<EarningsCohortRow>(
    `SELECT grad_cohort, year_1, year_5, year_10,
            year_1_method, year_5_method, year_10_method, avg_salary
       FROM earnings_against_courses_merged
      WHERE unitid = $1
        AND replace(cip_code, '.', '') = replace($2, '.', '')
        AND credential_level = $3`,
    [unitid, cipCode, credentialLevel],
  );

  const sorted = sortCohortsDescending(rows);

  return {
    year_1: resolveMetric(sorted, "year_1", "year_1_method"),
    year_5: resolveMetric(sorted, "year_5", "year_5_method"),
    year_10: resolveMetric(sorted, "year_10", "year_10_method"),
    avg_salary: resolveAvgSalary(sorted),
  };
}
