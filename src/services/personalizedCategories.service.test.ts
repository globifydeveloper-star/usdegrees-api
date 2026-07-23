import assert from "node:assert/strict";
import { test } from "node:test";
import {
  UserPreferences,
  EMPTY_PREFERENCES,
  hasAnyPreference,
  buildPersonalizedCategoryQuery,
  buildPreferenceCacheKey,
  resolvePersonalizedCategories,
  degreeLevelNameToCredentialId,
  COLD_START_THRESHOLD,
  FallbackTier,
} from "./personalizedCategories.service";
import { CategoryPopularityRow } from "./popularCategories.service";

function prefs(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return { ...EMPTY_PREFERENCES, ...overrides };
}

function rows(
  level: number,
  count: number,
  scoreStart = 100,
): CategoryPopularityRow[] {
  return Array.from({ length: count }, (_, i) => ({
    credential_level: level,
    category_id: `L${level}-C${i + 1}`,
    category_name: `Category ${level}-${i + 1}`,
    popularity_score: scoreStart - i,
    level_rank: i + 1,
  }));
}

// ── zero fields ────────────────────────────────────────────────────────

test("hasAnyPreference: zero fields set returns false", () => {
  assert.equal(hasAnyPreference(EMPTY_PREFERENCES), false);
});

test("hasAnyPreference: any single populated field returns true", () => {
  assert.equal(hasAnyPreference(prefs({ targetDegreeLevel: 3 })), true);
  assert.equal(hasAnyPreference(prefs({ preferredCollegeType: "Public" })), true);
  assert.equal(hasAnyPreference(prefs({ preferredStates: ["CA"] })), true);
  assert.equal(hasAnyPreference(prefs({ preferredMajors: ["Nursing"] })), true);
});

// ── query builder: partial-field matching ────────────────────────────────

test("buildPersonalizedCategoryQuery: no fields set applies no preference conditions", () => {
  const { sql, params } = buildPersonalizedCategoryQuery(EMPTY_PREFERENCES, {
    applyStates: true,
  });
  assert.equal(params.length, 0);
  assert.ok(!sql.includes("credential_level ="));
  assert.ok(!sql.includes("school_type ILIKE"));
  assert.ok(!sql.includes("state = ANY"));
  assert.ok(!sql.includes("title ILIKE ANY"));
});

test("buildPersonalizedCategoryQuery: only preferred_states set applies just that condition", () => {
  const { sql, params } = buildPersonalizedCategoryQuery(
    prefs({ preferredStates: ["CA", "NY"] }),
    { applyStates: true },
  );
  assert.equal(params.length, 1);
  assert.deepEqual(params[0], ["CA", "NY"]);
  assert.ok(sql.includes("state = ANY($1::text[])"));
  assert.ok(!sql.includes("credential_level ="));
  assert.ok(!sql.includes("school_type ILIKE"));
  assert.ok(!sql.includes("title ILIKE ANY"));
});

test("buildPersonalizedCategoryQuery: all 4 fields set applies all conditions independently", () => {
  const { sql, params } = buildPersonalizedCategoryQuery(
    prefs({
      targetDegreeLevel: 3,
      preferredCollegeType: "Public",
      preferredStates: ["CA"],
      preferredMajors: ["Nursing", "Biology"],
    }),
    { applyStates: true },
  );
  assert.equal(params.length, 4);
  assert.equal(params[0], 3);
  assert.equal(params[1], "Public%");
  assert.deepEqual(params[2], ["CA"]);
  assert.deepEqual(params[3], ["%Nursing%", "%Biology%"]);
  assert.ok(sql.includes("p.credential_level = $1"));
  // school_type lives on programs, not schools — regression guard for the
  // "column school_type does not exist" bug (schools has no such column).
  assert.ok(sql.includes("p.school_type ILIKE $2"));
  assert.ok(!sql.includes("s.school_type"));
  assert.ok(sql.includes("s.state = ANY($3::text[])"));
  assert.ok(sql.includes("p.title ILIKE ANY($4::text[])"));
});

test("buildPersonalizedCategoryQuery: preferred_college_type filters against programs.school_type, not schools", () => {
  const { sql } = buildPersonalizedCategoryQuery(
    prefs({ preferredCollegeType: "Private" }),
    { applyStates: true },
  );
  assert.ok(sql.includes("p.school_type ILIKE $1"));
  assert.ok(!sql.includes("s.school_type"));
});

test("buildPersonalizedCategoryQuery: applyStates=false drops the states condition even when preferredStates is populated", () => {
  const { sql, params } = buildPersonalizedCategoryQuery(
    prefs({ targetDegreeLevel: 3, preferredStates: ["CA"] }),
    { applyStates: false },
  );
  assert.equal(params.length, 1);
  assert.equal(params[0], 3);
  assert.ok(!sql.includes("state = ANY"));
});

// ── cache key ─────────────────────────────────────────────────────────

test("buildPreferenceCacheKey: order of states/majors does not change the key", () => {
  const a = buildPreferenceCacheKey(
    prefs({ preferredStates: ["NY", "CA"], preferredMajors: ["Bio", "CS"] }),
  );
  const b = buildPreferenceCacheKey(
    prefs({ preferredStates: ["CA", "NY"], preferredMajors: ["CS", "Bio"] }),
  );
  assert.equal(a, b);
});

test("buildPreferenceCacheKey: different preferences produce different keys", () => {
  const a = buildPreferenceCacheKey(prefs({ targetDegreeLevel: 3 }));
  const b = buildPreferenceCacheKey(prefs({ targetDegreeLevel: 5 }));
  assert.notEqual(a, b);
});

// ── degree level name -> credential id ──────────────────────────────────

test("degreeLevelNameToCredentialId maps canonical names and rejects unknown ones", () => {
  assert.equal(degreeLevelNameToCredentialId("Bachelor's Degree"), 3);
  assert.equal(degreeLevelNameToCredentialId("Master's Degree"), 5);
  assert.equal(degreeLevelNameToCredentialId(null), null);
  assert.equal(degreeLevelNameToCredentialId("Not A Real Level"), null);
});

// ── cascade: tiers ────────────────────────────────────────────────────

function fakeDeps(
  fetchResults: CategoryPopularityRow[][],
  defaultRows: CategoryPopularityRow[],
  fallbacks: FallbackTier[],
) {
  let call = 0;
  return {
    fetchFiltered: async () => fetchResults[call++],
    fetchDefault: async () => defaultRows,
    onFallback: (tier: FallbackTier) => fallbacks.push(tier),
  };
}

test("cascade: enough matches on the primary filtered query returns 'personalized' with no fallback", async () => {
  const fallbacks: FallbackTier[] = [];
  const primary = rows(3, COLD_START_THRESHOLD + 1);
  const deps = fakeDeps([primary], [], fallbacks);

  const result = await resolvePersonalizedCategories(
    prefs({ targetDegreeLevel: 3, preferredStates: ["CA"] }),
    deps,
  );

  assert.equal(result.source, "personalized");
  assert.equal(fallbacks.length, 0);
  assert.ok(result.categories.length > 0);
});

test("cold-start tier 1: sparse primary results with a state preference relax to 'personalized_state_relaxed'", async () => {
  const fallbacks: FallbackTier[] = [];
  const primary = rows(3, 5); // <= threshold
  const relaxed = rows(3, COLD_START_THRESHOLD + 5); // > threshold once states dropped
  const deps = fakeDeps([primary, relaxed], [], fallbacks);

  const result = await resolvePersonalizedCategories(
    prefs({ targetDegreeLevel: 3, preferredStates: ["WY"] }),
    deps,
  );

  assert.equal(result.source, "personalized_state_relaxed");
  assert.deepEqual(fallbacks, ["state_relaxed"]);
});

test("cold-start tier 2: still sparse after dropping states falls back to 'default_biased'", async () => {
  const fallbacks: FallbackTier[] = [];
  const primary = rows(3, 2);
  const relaxed = rows(3, 3); // still <= threshold
  const defaultRows = [...rows(1, 5), ...rows(3, 8), ...rows(5, 5)];
  const deps = fakeDeps([primary, relaxed], defaultRows, fallbacks);

  const result = await resolvePersonalizedCategories(
    prefs({ targetDegreeLevel: 3, preferredStates: ["WY"] }),
    deps,
  );

  assert.equal(result.source, "default_biased");
  assert.deepEqual(fallbacks, ["state_relaxed", "default_biased"]);
  // biased mode should pull in extra level-3 categories vs. the unbiased default slot count
  const level3Count = result.categories.filter(
    (c) => c.credential_level === 3,
  ).length;
  assert.ok(level3Count > 0);
});

test("cold-start with no state preference skips the state-relax tier and goes straight to default_biased", async () => {
  const fallbacks: FallbackTier[] = [];
  const primary = rows(3, 2); // <= threshold, no states set
  const defaultRows = rows(3, 8);
  const deps = fakeDeps([primary], defaultRows, fallbacks);

  const result = await resolvePersonalizedCategories(
    prefs({ targetDegreeLevel: 3, preferredMajors: ["Nursing"] }),
    deps,
  );

  assert.equal(result.source, "default_biased");
  assert.deepEqual(fallbacks, ["default_biased"]);
});
