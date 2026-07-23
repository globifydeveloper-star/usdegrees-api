import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EarningsCohortRow,
  resolveMetric,
  resolveAvgSalary,
  sortCohortsDescending,
} from "./earnings.service";

function row(
  partial: Partial<EarningsCohortRow> & { grad_cohort: string },
): EarningsCohortRow {
  return {
    year_1: null,
    year_5: null,
    year_10: null,
    year_1_method: null,
    year_5_method: null,
    year_10_method: null,
    avg_salary: null,
    ...partial,
  };
}

test("sorts cohorts descending and pushes the 0000 placeholder last", () => {
  const rows = [
    row({ grad_cohort: "2010" }),
    row({ grad_cohort: "0000" }),
    row({ grad_cohort: "2019" }),
    row({ grad_cohort: "2013" }),
  ];
  assert.deepEqual(
    sortCohortsDescending(rows).map((r) => r.grad_cohort),
    ["2019", "2013", "2010", "0000"],
  );
});

test("resolveMetric picks the most recent cohort even when its value is generated, not reported", () => {
  const rows = sortCohortsDescending([
    row({ grad_cohort: "2019", year_5: 50000, year_5_method: "interpolated" }),
    row({ grad_cohort: "2016", year_5: 48000, year_5_method: null }), // null => user_reported
    row({ grad_cohort: "2013", year_5: 45000, year_5_method: null }),
  ]);
  assert.deepEqual(resolveMetric(rows, "year_5", "year_5_method"), {
    value: 50000,
    method: "interpolated",
    cohort: "2019",
  });
});

test("resolveMetric regression: newer extrapolated cohort wins over older reported cohort", () => {
  // Exact scenario from the bug report: 2010 is extrapolated, 2007 is
  // reported. Recency wins — the resolver must not silently drop the newer
  // generated value in favor of the older reported one.
  const rows = sortCohortsDescending([
    row({ grad_cohort: "2010", year_1: 42000, year_1_method: "extrapolated" }),
    row({ grad_cohort: "2007", year_1: 39000, year_1_method: null }), // null => user_reported
  ]);
  assert.deepEqual(resolveMetric(rows, "year_1", "year_1_method"), {
    value: 42000,
    method: "extrapolated",
    cohort: "2010",
  });
});

test("resolveMetric skips only skipped_future/skipped_no_anchor cohorts, then picks the next most recent usable value", () => {
  const rows = sortCohortsDescending([
    row({
      grad_cohort: "2019",
      year_1: 40000,
      year_1_method: "skipped_no_anchor",
    }),
    row({ grad_cohort: "2016", year_1: 38000, year_1_method: "extrapolated" }),
    row({
      grad_cohort: "2013",
      year_1: 36000,
      year_1_method: "low_confidence",
    }),
  ]);
  assert.deepEqual(resolveMetric(rows, "year_1", "year_1_method"), {
    value: 38000,
    method: "extrapolated",
    cohort: "2016",
  });
});

test("resolveMetric picks low_confidence over nothing when it's the most recent usable value", () => {
  const rows = sortCohortsDescending([
    row({
      grad_cohort: "2019",
      year_10: null,
      year_10_method: "skipped_future",
    }),
    row({
      grad_cohort: "2010",
      year_10: 60000,
      year_10_method: "low_confidence",
    }),
  ]);
  assert.deepEqual(resolveMetric(rows, "year_10", "year_10_method"), {
    value: 60000,
    method: "low_confidence",
    cohort: "2010",
  });
});

test("resolveMetric still prefers a more recent reported/interpolated/extrapolated cohort over an older low_confidence one", () => {
  const rows = sortCohortsDescending([
    row({
      grad_cohort: "2016",
      year_10: 58000,
      year_10_method: "interpolated",
    }),
    row({
      grad_cohort: "2010",
      year_10: 60000,
      year_10_method: "low_confidence",
    }),
  ]);
  assert.deepEqual(resolveMetric(rows, "year_10", "year_10_method"), {
    value: 58000,
    method: "interpolated",
    cohort: "2016",
  });
});

test("resolveMetric returns null when nothing usable exists across cohorts", () => {
  const rows = sortCohortsDescending([
    row({
      grad_cohort: "2019",
      year_10: null,
      year_10_method: "skipped_future",
    }),
    row({
      grad_cohort: "2016",
      year_10: null,
      year_10_method: "skipped_no_anchor",
    }),
  ]);
  assert.equal(resolveMetric(rows, "year_10", "year_10_method"), null);
});

test("resolveMetric never selects the 0000 placeholder over a real cohort", () => {
  const rows = sortCohortsDescending([
    row({ grad_cohort: "0000", year_5: 999999, year_5_method: null }),
    row({ grad_cohort: "2011", year_5: 42000, year_5_method: null }),
  ]);
  assert.deepEqual(resolveMetric(rows, "year_5", "year_5_method"), {
    value: 42000,
    method: "user_reported",
    cohort: "2011",
  });
});

test("resolveAvgSalary anchors to the recency-first year_5 resolution and flags estimated basis", () => {
  const reported = sortCohortsDescending([
    row({ grad_cohort: "2016", year_5_method: null, avg_salary: 55000 }),
  ]);
  assert.deepEqual(resolveAvgSalary(reported), {
    value: 55000,
    cohort: "2016",
    basis: "year_5",
    basis_is_estimated: false,
  });

  const estimated = sortCohortsDescending([
    row({
      grad_cohort: "2019",
      year_5_method: "interpolated",
      avg_salary: 61000,
    }),
  ]);
  assert.deepEqual(resolveAvgSalary(estimated), {
    value: 61000,
    cohort: "2019",
    basis: "year_5",
    basis_is_estimated: true,
  });
});

test("resolveAvgSalary picks the most recent cohort's year_5 even when an older reported cohort exists", () => {
  const rows = sortCohortsDescending([
    row({
      grad_cohort: "2019",
      year_5_method: "extrapolated",
      avg_salary: 61000,
    }),
    row({ grad_cohort: "2013", year_5_method: null, avg_salary: 50000 }),
  ]);
  assert.deepEqual(resolveAvgSalary(rows), {
    value: 61000,
    cohort: "2019",
    basis: "year_5",
    basis_is_estimated: true,
  });
});

test("resolveAvgSalary returns null when no cohort has a usable year_5", () => {
  const rows = sortCohortsDescending([
    row({
      grad_cohort: "2019",
      year_5_method: "skipped_future",
      avg_salary: null,
    }),
  ]);
  assert.equal(resolveAvgSalary(rows), null);
});
