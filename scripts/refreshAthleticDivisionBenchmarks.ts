/**
 * refreshAthleticDivisionBenchmarks.ts
 *
 * Recomputes per-division/survey_year averages from athletic_summary and
 * upserts them into athletic_division_benchmarks. Run after every EADA data
 * import (typically annually) - see src/db/migrations/athletic_division_benchmarks.sql
 * for the table definition.
 *
 * Usage: npm run refresh:athletic-benchmarks
 */
import "dotenv/config";
import pool from "../src/db/client";
import { parseCurrencyString } from "../src/utils/currency";

interface SummaryRow {
  division: string;
  survey_year: string;
  athletes_total: string | null;
  avg_aid_per_athlete: string | null;
  recruiting_expense: string | null;
  athletic_revenue: string | null;
  athletic_expense: string | null;
}

function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

async function run() {
  const { rows } = await pool.query<SummaryRow>(
    `SELECT division, survey_year, athletes_total, avg_aid_per_athlete,
            recruiting_expense, athletic_revenue, athletic_expense
     FROM athletic_summary`,
  );

  const groups = new Map<string, SummaryRow[]>();
  for (const row of rows) {
    const key = row.division + "|" + row.survey_year;
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  let written = 0;
  for (const group of groups.values()) {
    const division = group[0].division;
    const surveyYear = group[0].survey_year;

    const avgAthletesTotal = average(
      group.map((r) => parseCurrencyString(r.athletes_total)),
    );
    const avgAidPerAthlete = average(
      group.map((r) => parseCurrencyString(r.avg_aid_per_athlete)),
    );
    const avgRecruitingExpense = average(
      group.map((r) => parseCurrencyString(r.recruiting_expense)),
    );
    const avgRevenue = average(
      group.map((r) => parseCurrencyString(r.athletic_revenue)),
    );
    const avgExpense = average(
      group.map((r) => parseCurrencyString(r.athletic_expense)),
    );

    await pool.query(
      `INSERT INTO athletic_division_benchmarks
         (division, survey_year, avg_athletes_total, avg_aid_per_athlete,
          avg_recruiting_expense, avg_revenue, avg_expense, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (division, survey_year) DO UPDATE SET
         avg_athletes_total = EXCLUDED.avg_athletes_total,
         avg_aid_per_athlete = EXCLUDED.avg_aid_per_athlete,
         avg_recruiting_expense = EXCLUDED.avg_recruiting_expense,
         avg_revenue = EXCLUDED.avg_revenue,
         avg_expense = EXCLUDED.avg_expense,
         updated_at = now()`,
      [
        division,
        surveyYear,
        avgAthletesTotal,
        avgAidPerAthlete,
        avgRecruitingExpense,
        avgRevenue,
        avgExpense,
      ],
    );
    written += 1;
  }

  console.log(
    "Refreshed " + written + " division/survey_year benchmark rows from " + rows.length + " athletic_summary rows.",
  );
  await pool.end();
}

run().catch((err) => {
  console.error("Failed to refresh athletic division benchmarks:", err);
  process.exit(1);
});
