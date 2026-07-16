/**
 * currency.ts
 *
 * EADA-sourced currency columns (athletic_summary.*) are stored with BROKEN
 * comma grouping — e.g. "$45,50,865" instead of "$4,550,865". The digits are
 * correct, only the grouping is wrong, so comma positions must never be
 * trusted. Parsing strips every "$" and "," and reads the remaining digits
 * as a plain integer.
 */

/**
 * Parses a broken-comma-grouped currency string (e.g. "$45,50,865") into an
 * integer number of dollars, ignoring comma placement entirely.
 *
 * Returns null for missing/unreported values ("-", "", null, undefined) so
 * they can be excluded from averages rather than skewing them toward zero.
 */
export function parseCurrencyString(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const digits = value.replace(/[$,]/g, "").trim();

  if (digits === "" || digits === "-") return null;

  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}
