/**
 * Slot allocation for the homepage "Popular Categories" feature.
 * Keyed by credential_level (see src/constants/credentials.ts).
 * Used both as the anonymous-user default and as the fallback layer for
 * personalized results — the same allocation just gets biased toward a
 * caller's target_degree_level when one is known.
 */
export const DEFAULT_CATEGORY_SLOTS: Record<number, number> = {
  1: 3, // Undergraduate Certificate or Diploma
  2: 3, // Associate's Degree
  3: 6, // Bachelor's Degree
  4: 2, // Post-baccalaureate Certificate
  5: 4, // Master's Degree
  6: 2, // Doctoral Degree
  7: 2, // First Professional Degree
  8: 2, // Graduate/Professional Certificate
};

/** Multiplier applied to a single credential_level's slot count in biased mode. */
export const BIAS_MULTIPLIER = 2;

/**
 * Returns the slot allocation to use for a request. When targetDegreeLevel
 * is a known credential_level, that level's slot count is multiplied by
 * BIAS_MULTIPLIER ("biased" mode); otherwise the default allocation is
 * returned unchanged.
 */
export function getSlotAllocation(
  targetDegreeLevel?: number | null,
): Record<number, number> {
  const slots = { ...DEFAULT_CATEGORY_SLOTS };
  if (targetDegreeLevel != null && slots[targetDegreeLevel] !== undefined) {
    slots[targetDegreeLevel] = slots[targetDegreeLevel] * BIAS_MULTIPLIER;
  }
  return slots;
}
