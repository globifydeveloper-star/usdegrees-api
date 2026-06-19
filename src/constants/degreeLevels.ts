/**
 * Canonical controlled vocabulary for preferred degree level.
 * This module is the SINGLE source of truth — both GET /degree-levels and the
 * PATCH /profile validator read from it. Order is canonical and must be preserved.
 */
export const DEGREE_LEVELS = [
  "Undergraduate Certificate or Diploma",
  "Associate's Degree",
  "Bachelor's Degree",
  "Post-baccalaureate Certificate",
  "Master's Degree",
  "Doctoral Degree",
  "First Professional Degree",
  "Graduate/Professional Certificate",
] as const;

export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

const DEGREE_LEVEL_SET = new Set<string>(DEGREE_LEVELS);

/** Known legacy short forms → canonical value. Keyed by lowercased input. */
const LEGACY_DEGREE_LEVEL_MAP: Record<string, DegreeLevel> = {
  "bachelor's": "Bachelor's Degree",
  bachelors: "Bachelor's Degree",
  "associate's": "Associate's Degree",
  associates: "Associate's Degree",
  "master's": "Master's Degree",
  masters: "Master's Degree",
  doctoral: "Doctoral Degree",
  doctorate: "Doctoral Degree",
};

/**
 * Normalize an input to a canonical degree level.
 * Returns the canonical string if it is already canonical or a known legacy
 * short form; otherwise null (caller decides to strip/reject).
 */
export function normalizeDegreeLevel(input: unknown): DegreeLevel | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (DEGREE_LEVEL_SET.has(trimmed)) return trimmed as DegreeLevel;
  return LEGACY_DEGREE_LEVEL_MAP[trimmed.toLowerCase()] ?? null;
}
