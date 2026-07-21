/**
 * reportPayload.service.ts  — FULLY WIRED to real schema
 * ------------------------------------------------------------------
 * DB access: `pg` Pool (../../db/client), same as every other route/service
 * in this codebase. There is no Supabase client anywhere in this project.
 *
 * Tables: usdusers, usdreports, schools, admissions,
 *         admission_disclosure_categories, net_price_public_income,
 *         net_price_private_income, earnings_against_courses_merged, costs,
 *         debt_income_ratio, roi, programs
 * Utils:  calculateAdmissionFit (utils/admissionScore), analyzeRoi (utils/roi)
 *
 * Known limitations (intentional, not bugs):
 *  - Vintages: no vintage columns exist, so they are constants below.
 *    Promote to real columns later; the AI only cites what we pass.
 *  - Program earnings: usdusers has no program/CIP. Pass programCip per
 *    school for true program-level earnings; otherwise the builder
 *    aggregates year_10 across the school's programs and labels it so.
 */

import pool from "../../db/client";
import type { C1LitePayload } from "./reportPrompt";
import { calculateAdmissionFit } from "../utils/admissionScore";
import { analyzeRoi } from "../utils/roi";
import { normalizeEarningsFillMethod } from "../../types/earnings";

// ---- vintage constants (no DB columns yet) -----------------------
const NET_PRICE_VINTAGE = "2023–24 Scorecard";
const ADMISSIONS_VINTAGE = "IPEDS";

// ---- income bracket -> net-price column --------------------------
export type IncomeBracket =
  | "0_30000" | "30001_48000" | "48001_75000" | "75001_110000" | "110001_plus";

const BRACKET_TO_COLUMN: Record<IncomeBracket, string> = {
  "0_30000": "income_0_30000",
  "30001_48000": "income_30001_48000",
  "48001_75000": "income_48001_75000",
  "75001_110000": "income_75001_110000",
  "110001_plus": "income_110001_plus",
};
const BRACKET_TO_LABEL: Record<IncomeBracket, string> = {
  "0_30000": "$0 – $30,000",
  "30001_48000": "$30,001 – $48,000",
  "48001_75000": "$48,001 – $75,000",
  "75001_110000": "$75,001 – $110,000",
  "110001_plus": "$110,001+",
};

// Disclosure categories that make an academic fit score meaningless.
const NO_FIT_CATEGORIES = new Set(["A_OPEN_ADMISSION", "B_NOT_USED", "F_INSTITUTION_CLOSED"]);

// ------------------------------------------------------------------
// Net price + sector (sector derived from which net-price table the
// unitid appears in; public is checked first).
// ------------------------------------------------------------------
async function fetchNetPriceAndSector(
  unitid: number,
  bracket: IncomeBracket | null,
): Promise<{ sector: string; value: number | null }> {
  const col = bracket ? BRACKET_TO_COLUMN[bracket] : null;

  const pub = await pool.query(
    `SELECT ${col ? `"${col}"` : "unitid"} FROM net_price_public_income WHERE unitid = $1 LIMIT 1`,
    [unitid],
  );
  if (pub.rows.length > 0) {
    return { sector: "Public, 4-year", value: col ? (pub.rows[0][col] ?? null) : null };
  }

  const pri = await pool.query(
    `SELECT ${col ? `"${col}"` : "unitid"} FROM net_price_private_income WHERE unitid = $1 LIMIT 1`,
    [unitid],
  );
  if (pri.rows.length > 0) {
    return { sector: "Private, 4-year", value: col ? (pri.rows[0][col] ?? null) : null };
  }
  return { sector: "Unknown", value: null };
}

// ------------------------------------------------------------------
// Disclosure (verbatim copy the AI must not rewrite)
// ------------------------------------------------------------------
async function fetchDisclosure(category: string) {
  const { rows } = await pool.query(
    `SELECT badge_label, supporting_copy, disclaimer_tier, disclaimer_text, show_admission_rate_required
       FROM admission_disclosure_categories WHERE category = $1 LIMIT 1`,
    [category],
  );
  if (!rows.length) throw new Error(`no disclosure row for "${category}"`);
  return rows[0];
}

// ------------------------------------------------------------------
// Admissions (SAT bands, admit rate, disclosure category)
// ------------------------------------------------------------------
async function fetchAdmissions(unitid: number) {
  const { rows } = await pool.query(
    `SELECT admission_rate, sat_avg_overall, sat_p25_math, sat_p75_math, sat_p25_reading,
            sat_p75_reading, school_min_range, school_max_range, sat_disclosure_category,
            publish_publicly
       FROM admissions WHERE unitid = $1 LIMIT 1`,
    [unitid],
  );
  return rows[0] ?? null;
}

// ------------------------------------------------------------------
// Program earnings (year_10) — program-level if cip given, else aggregate
// ------------------------------------------------------------------
async function fetchProgramEarnings(unitid: number, programCip?: string) {
  if (programCip) {
    const { rows } = await pool.query(
      `SELECT year_10, year_10_method, grad_cohort
         FROM earnings_against_courses_merged
        WHERE unitid = $1 AND replace(cip_code, '.', '') = replace($2, '.', '') AND year_10 IS NOT NULL
        ORDER BY grad_cohort DESC LIMIT 1`,
      [unitid, programCip],
    );
    if (!rows.length) return { earnings: null, vintage: null, method_flag: null };
    const data = rows[0];
    return {
      earnings: data.year_10 != null ? Math.round(Number(data.year_10)) : null,
      vintage: data.grad_cohort ?? null,
      method_flag: normalizeEarningsFillMethod(data.year_10_method),
    };
  }
  // Aggregate across the school's programs.
  const { rows } = await pool.query(
    `SELECT year_10 FROM earnings_against_courses_merged WHERE unitid = $1 AND year_10 IS NOT NULL`,
    [unitid],
  );
  const vals = rows.map((r: { year_10: number | string }) => Number(r.year_10)).filter((v: number) => !Number.isNaN(v));
  if (!vals.length) return { earnings: null, vintage: null, method_flag: null };
  const avg = Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
  return {
    earnings: avg,
    vintage: "school-level average",
    method_flag: `aggregated year_10 across ${vals.length} programs`,
  };
}

// ── OLD raw-table query — kept for rollback, not executed ──────────────────
// async function fetchProgramEarningsLegacy(unitid: number, programCip?: string) {
//   if (programCip) {
//     const { rows } = await pool.query(
//       `SELECT year_10, year_10_method, grad_cohort
//          FROM earnings_against_courses
//         WHERE unitid = $1 AND replace(cip_code, '.', '') = replace($2, '.', '') AND year_10 IS NOT NULL
//         ORDER BY grad_cohort DESC LIMIT 1`,
//       [unitid, programCip],
//     );
//     ...
//   }
//   const { rows } = await pool.query(
//     `SELECT year_10 FROM earnings_against_courses WHERE unitid = $1 AND year_10 IS NOT NULL`,
//     [unitid],
//   );
//   ...
// }

// Sticker price + ROI supplementary blob.
async function fetchCosts(unitid: number) {
  const { rows } = await pool.query(
    `SELECT sticker_price_by_api, for_roi_data FROM costs WHERE unitid = $1 LIMIT 1`,
    [unitid],
  );
  const data = rows[0];
  return {
    sticker: data?.sticker_price_by_api != null ? Math.round(Number(data.sticker_price_by_api)) : null,
    forRoi: data?.for_roi_data ?? null, // JSON blob, not itself an ROI figure — see fetchRoi()
  };
}

// Precomputed 20-year ROI, keyed by unitid + credential_level (via `roi`
// table). credential_level is resolved from `programs` when a programCip is
// given; otherwise we take the best available row for the school, same
// fallback used in routes/search.ts.
async function fetchRoi(unitid: number, programCip?: string) {
  let credentialLevel: number | null = null;
  if (programCip) {
    const prog = await pool.query(
      `SELECT credential_level FROM programs WHERE unitid = $1 AND replace(cip_code, '.', '') = replace($2, '.', '') LIMIT 1`,
      [unitid, programCip],
    );
    credentialLevel = prog.rows[0]?.credential_level ?? null;
  }
  const { rows } = await pool.query(
    `SELECT avg_salary, total_cost, roi_20yr FROM roi
      WHERE unitid = $1
      ORDER BY CASE WHEN credential_level = $2 THEN 0 ELSE 1 END
      LIMIT 1`,
    [unitid, credentialLevel],
  );
  const data = rows[0];
  return {
    avgSalary: data?.avg_salary != null ? Number(data.avg_salary) : null,
    totalCost: data?.total_cost != null ? Number(data.total_cost) : null,
    roi20Yr: data?.roi_20yr != null ? Number(data.roi_20yr) : null,
  };
}

// Typical debt at completion + debt-to-income (federal outcome metric).
async function fetchDebt(unitid: number) {
  const { rows } = await pool.query(
    `SELECT avg_debt, debt_income_ratio, ratio_text FROM debt_income_ratio WHERE unitid = $1 LIMIT 1`,
    [unitid],
  );
  const data = rows[0];
  return {
    avg_debt: data?.avg_debt != null ? Math.round(Number(data.avg_debt)) : null,
    ratio: data?.debt_income_ratio != null ? Number(data.debt_income_ratio) : null,
    ratio_text: data?.ratio_text ?? null,
  };
}

async function fetchStudent(userId: number) {
  const { rows } = await pool.query(
    `SELECT display_name, gpa, sat_score, sat_math, sat_reading_writing, act_score,
            graduation_year, high_school_name, preferred_degree_level, preferred_college_type
       FROM usdusers WHERE id = $1 LIMIT 1`,
    [userId],
  );
  if (!rows.length) throw new Error(`user fetch (${userId}): no row`);
  return rows[0];
}

async function fetchReportMeta(reportReferenceId: string) {
  const { rows } = await pool.query(
    `SELECT report_reference_id, created_at FROM usdreports WHERE report_reference_id = $1 LIMIT 1`,
    [reportReferenceId],
  );
  if (!rows.length) throw new Error(`report fetch (${reportReferenceId}): no row`);
  return rows[0];
}

async function fetchSchool(unitid: number) {
  const { rows } = await pool.query(
    `SELECT name, city, state, accreditor, is_active FROM schools WHERE unitid = $1 LIMIT 1`,
    [unitid],
  );
  if (!rows.length) throw new Error(`school fetch (${unitid}): no row`);
  return rows[0];
}

// ------------------------------------------------------------------
// Derived flags (pure computation)
// ------------------------------------------------------------------
function computeDerivedFlags(
  studentSat: number | null,
  schools: C1LitePayload["schools"],
  roi20YrByName: Record<string, number>,
): C1LitePayload["derived_flags"] {
  const merit: string[] = [];
  const reach: string[] = [];
  for (const s of schools) {
    if (studentSat != null && s.sat_75 != null && studentSat > s.sat_75) merit.push(s.name);
    if (studentSat != null && s.sat_25 != null && studentSat < s.sat_25) reach.push(s.name);
  }
  const costs = schools.map((s) => s.net_price_bracket).filter((v): v is number => v != null);
  const earns = schools.map((s) => s.program_earnings).filter((v): v is number => v != null);
  const debts = schools.map((s) => s.avg_debt).filter((v): v is number => v != null);

  // Factual highest-value ROI figure — NOT a recommendation. Ties resolve to
  // payload order (first school with the max value).
  let bestRoiSchool = "";
  let bestRoi = -Infinity;
  for (const s of schools) {
    const v = roi20YrByName[s.name];
    if (v != null && v > bestRoi) {
      bestRoi = v;
      bestRoiSchool = s.name;
    }
  }

  return {
    merit_flag_schools: merit,
    reach_flag_schools: reach,
    best_roi_school: bestRoiSchool,
    cost_range_low: costs.length ? String(Math.min(...costs)) : "",
    cost_range_high: costs.length ? String(Math.max(...costs)) : "",
    earnings_range_low: earns.length ? String(Math.min(...earns)) : "",
    earnings_range_high: earns.length ? String(Math.max(...earns)) : "",
    debt_range_low: debts.length ? String(Math.min(...debts)) : "",
    debt_range_high: debts.length ? String(Math.max(...debts)) : "",
  };
}

// ------------------------------------------------------------------
// Orchestrator
// ------------------------------------------------------------------
export async function buildC1LitePayload(args: {
  userId: number;
  reportReferenceId: string;
  schools: Array<{ unitid: number; programCip?: string }>;
  incomeBracket: IncomeBracket | null;
  methodologyVersion?: string;
}): Promise<C1LitePayload> {
  const { userId, reportReferenceId, incomeBracket } = args;

  const [student, meta] = await Promise.all([
    fetchStudent(userId),
    fetchReportMeta(reportReferenceId),
  ]);

  const studentTotalSat =
    student.sat_score ??
    (student.sat_math != null && student.sat_reading_writing != null
      ? student.sat_math + student.sat_reading_writing
      : null);

  const out: C1LitePayload["schools"] = [];
  const roi20YrByName: Record<string, number> = {};

  for (const { unitid, programCip } of args.schools) {
    const core = await fetchSchool(unitid);

    const [np, adm, earn, costs, debt, roi] = await Promise.all([
      fetchNetPriceAndSector(unitid, incomeBracket),
      fetchAdmissions(unitid),
      fetchProgramEarnings(unitid, programCip),
      fetchCosts(unitid),
      fetchDebt(unitid),
      fetchRoi(unitid, programCip),
    ]);

    const category = adm?.sat_disclosure_category ?? "E_TEST_REQUIRED_NO_RANGE";
    const disc = await fetchDisclosure(category);

    // Total SAT bands: prefer school range, fall back to summed p25/p75.
    const sat25 =
      adm?.school_min_range ??
      (adm?.sat_p25_math != null && adm?.sat_p25_reading != null
        ? Number(adm.sat_p25_math) + Number(adm.sat_p25_reading) : null);
    const sat75 =
      adm?.school_max_range ??
      (adm?.sat_p75_math != null && adm?.sat_p75_reading != null
        ? Number(adm.sat_p75_math) + Number(adm.sat_p75_reading) : null);

    // admission_rate may be fraction (0.65) or percent (65). Normalize.
    const rawRate = adm?.admission_rate != null ? Number(adm.admission_rate) : null;
    const rateFraction = rawRate == null ? null : rawRate > 1 ? rawRate / 100 : rawRate;
    const showRate = disc.show_admission_rate_required && adm?.publish_publicly !== false;
    const admitRatePct =
      showRate && rateFraction != null ? Math.round(rateFraction * 100) : null;

    // Fit — skip for open-admission / test-not-used / closed.
    let fitScore: number | null = null;
    let fitLabel: string | null = "Not applicable";
    if (!NO_FIT_CATEGORIES.has(category)) {
      const fit = calculateAdmissionFit(
        {
          gpa: student.gpa,
          satMath: student.sat_math,
          satReadingWriting: student.sat_reading_writing,
          actScore: student.act_score,
        },
        {
          admissionRate: rateFraction,
          satAvg: adm?.sat_avg_overall != null ? Number(adm.sat_avg_overall) : null,
          sat25Math: adm?.sat_p25_math != null ? Number(adm.sat_p25_math) : null,
          sat75Math: adm?.sat_p75_math != null ? Number(adm.sat_p75_math) : null,
          sat25Reading: adm?.sat_p25_reading != null ? Number(adm.sat_p25_reading) : null,
          sat75Reading: adm?.sat_p75_reading != null ? Number(adm.sat_p75_reading) : null,
        },
      );
      fitScore = fit.category === "Unavailable" ? null : fit.score;
      fitLabel = fit.category;
    }

    // ROI — roi_20yr is a real precomputed figure (roi table), NOT derived
    // from costs.for_roi_data (that column is an unrelated JSON blob). We
    // run it through the existing analyzeRoi() util rather than formatting
    // it ourselves, and never invent a figure when roi_20yr is null.
    const roiResult = analyzeRoi({
      unitid,
      totalCost: roi.totalCost,
      avgSalary: roi.avgSalary,
      roi20Yr: roi.roi20Yr,
    });

    if (roi.roi20Yr != null) roi20YrByName[core.name] = roi.roi20Yr;

    out.push({
      name: core.name,
      unitid: String(unitid),
      sector: np.sector,
      city: core.city,
      state: core.state,
      accreditor: core.accreditor,
      net_price_bracket: np.value,
      net_price_vintage: np.value != null ? NET_PRICE_VINTAGE : null,
      admit_rate: admitRatePct,
      admit_rate_vintage: admitRatePct != null ? ADMISSIONS_VINTAGE : null,
      sat_25: sat25,
      sat_75: sat75,
      sat_vintage: sat25 != null || sat75 != null ? ADMISSIONS_VINTAGE : null,
      fit_score: studentTotalSat == null && fitLabel !== "Not applicable" ? null : fitScore,
      fit_label: fitLabel,
      sat_data_category: category,
      disclosure: disc,
      program_earnings: earn.earnings,
      earnings_vintage: earn.vintage,
      earnings_method_flag: earn.method_flag,
      roi_ratio: roi.roi20Yr != null ? roiResult.roiFormatted : null,
      sticker_price: costs.sticker,
      sticker_vintage: costs.sticker != null ? NET_PRICE_VINTAGE : null,
      avg_debt: debt.avg_debt,
      debt_income_ratio: debt.ratio,
      debt_ratio_text: debt.ratio_text,
      debt_vintage: debt.avg_debt != null ? "College Scorecard" : null,
    });
  }

  return {
    report_meta: {
      report_reference_id: meta.report_reference_id,
      created_at: meta.created_at,
      generated_date: new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      }),
      methodology_version: args.methodologyVersion ?? "lite-v1",
    },
    student: {
      display_name: student.display_name,
      gpa: student.gpa,
      sat_score: student.sat_score,
      sat_math: student.sat_math,
      sat_reading_writing: student.sat_reading_writing,
      act_score: student.act_score,
      graduation_year: student.graduation_year,
      high_school_name: student.high_school_name,
      preferred_degree_level: student.preferred_degree_level,
      preferred_college_type: student.preferred_college_type,
      income_bracket_field: incomeBracket ? BRACKET_TO_COLUMN[incomeBracket] : null,
      income_bracket_label: incomeBracket ? BRACKET_TO_LABEL[incomeBracket] : null,
    },
    schools: out,
    derived_flags: computeDerivedFlags(studentTotalSat, out, roi20YrByName),
  };
}
