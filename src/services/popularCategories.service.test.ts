import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CategoryPopularityRow,
  selectPopularCategories,
} from "./popularCategories.service";
import { getSlotAllocation, DEFAULT_CATEGORY_SLOTS } from "../constants/homepageCategorySlots";

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

test("getSlotAllocation returns the default allocation when no target is given", () => {
  assert.deepEqual(getSlotAllocation(), DEFAULT_CATEGORY_SLOTS);
  assert.deepEqual(getSlotAllocation(null), DEFAULT_CATEGORY_SLOTS);
});

test("getSlotAllocation doubles only the target level's slots (biased mode)", () => {
  const slots = getSlotAllocation(3);
  assert.equal(slots[3], DEFAULT_CATEGORY_SLOTS[3] * 2);
  for (const level of Object.keys(DEFAULT_CATEGORY_SLOTS).map(Number)) {
    if (level !== 3) assert.equal(slots[level], DEFAULT_CATEGORY_SLOTS[level]);
  }
});

test("getSlotAllocation ignores an unknown target level", () => {
  assert.deepEqual(getSlotAllocation(999), DEFAULT_CATEGORY_SLOTS);
});

test("standard mode: takes the top-ranked categories per level up to slot count", () => {
  const slotConfig = { 1: 2, 2: 2 };
  const data = [...rows(1, 5), ...rows(2, 5)];
  const result = selectPopularCategories(data, slotConfig);

  const level1 = result.filter((c) => c.credential_level === 1);
  const level2 = result.filter((c) => c.credential_level === 2);
  assert.equal(level1.length, 2);
  assert.equal(level2.length, 2);
  assert.deepEqual(
    level1.map((c) => c.category_id),
    ["L1-C1", "L1-C2"],
  );
  // sort_order is assigned sequentially and unique across the response
  assert.deepEqual(
    result.map((c) => c.sort_order),
    result.map((_, i) => i + 1),
  );
});

test("biased mode: doubling a level's slots pulls in more of that level's categories", () => {
  const data = [...rows(1, 10), ...rows(2, 10)];
  const biasedSlots = getSlotAllocation(1);
  const result = selectPopularCategories(data, {
    1: biasedSlots[1],
    2: DEFAULT_CATEGORY_SLOTS[2],
  });

  const level1Count = result.filter((c) => c.credential_level === 1).length;
  const level2Count = result.filter((c) => c.credential_level === 2).length;
  assert.equal(level1Count, DEFAULT_CATEGORY_SLOTS[1] * 2);
  assert.equal(level2Count, DEFAULT_CATEGORY_SLOTS[2]);
});

test("empty level: backfills its slots from the next-highest-ranked categories across other levels", () => {
  const slotConfig = { 1: 3, 2: 2 };
  // Level 1 has zero categories; level 2 has plenty of surplus to backfill from.
  const data = rows(2, 6);
  const result = selectPopularCategories(data, slotConfig);

  // Total slots (5) should still be filled entirely from level 2.
  assert.equal(result.length, 5);
  assert.ok(result.every((c) => c.credential_level === 2));
  // Backfill picks the next-highest popularity_score categories not already selected.
  assert.deepEqual(
    result.map((c) => c.category_id).sort(),
    ["L2-C1", "L2-C2", "L2-C3", "L2-C4", "L2-C5"].sort(),
  );
});

test("partial deficit: a level short by a few slots is topped up without touching levels already at capacity", () => {
  const slotConfig = { 1: 2, 2: 2 };
  // Level 1 only has 1 category (deficit of 1); level 2 has surplus.
  const data = [...rows(1, 1, 200), ...rows(2, 5, 100)];
  const result = selectPopularCategories(data, slotConfig);

  assert.equal(result.length, 4);
  const level1 = result.filter((c) => c.credential_level === 1);
  const level2 = result.filter((c) => c.credential_level === 2);
  assert.equal(level1.length, 1);
  // level 2 keeps its 2 primary slots plus 1 backfilled slot for level 1's deficit
  assert.equal(level2.length, 3);
});

test("response rows carry credential_level, popularity_score, and sort_order", () => {
  const result = selectPopularCategories(rows(1, 3), { 1: 3 });
  for (const category of result) {
    assert.equal(typeof category.credential_level, "number");
    assert.equal(typeof category.popularity_score, "number");
    assert.equal(typeof category.sort_order, "number");
  }
});
