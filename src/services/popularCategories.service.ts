/**
 * popularCategories.service.ts
 *
 * Credential-level diversified "Popular Categories" selection.
 * Categories are (credential_level, cip_code) pairs from `programs`;
 * popularity_score = number of distinct schools offering that category at
 * that credential_level. Ranking and slot allocation happen in JS (not SQL)
 * so the backfill step can reason across levels and stay unit-testable.
 */

/** One (credential_level, category) row, already ranked within its level. */
export interface CategoryPopularityRow {
  credential_level: number;
  category_id: string;
  category_name: string;
  popularity_score: number;
  level_rank: number;
}

/** A category as returned to the client. */
export interface PopularCategory {
  category_id: string;
  category_name: string;
  credential_level: number;
  popularity_score: number;
  sort_order: number;
}

/**
 * SQL to fetch every (credential_level, cip_code) category, its popularity
 * score, and its rank within its own credential_level. No LIMIT — callers
 * apply slot allocation and backfill in JS over the full ranked set.
 */
export const CATEGORY_POPULARITY_QUERY = `
  WITH ranked AS (
    SELECT
      credential_level,
      cip_code,
      MIN(title) AS category_name,
      COUNT(DISTINCT unitid) AS popularity_score
    FROM programs
    WHERE credential_level IS NOT NULL AND cip_code IS NOT NULL
    GROUP BY credential_level, cip_code
  )
  SELECT
    credential_level,
    cip_code AS category_id,
    category_name,
    popularity_score,
    ROW_NUMBER() OVER (
      PARTITION BY credential_level
      ORDER BY popularity_score DESC, category_name ASC
    ) AS level_rank
  FROM ranked
  ORDER BY credential_level ASC, level_rank ASC
`;

function categoryKey(row: Pick<CategoryPopularityRow, "credential_level" | "category_id">): string {
  return `${row.credential_level}:${row.category_id}`;
}

/**
 * Applies slot allocation to ranked category rows, backfilling any
 * credential_level that has fewer categories than its slot count from the
 * next-highest-ranked categories across all levels (by popularity_score).
 */
export function selectPopularCategories(
  rows: CategoryPopularityRow[],
  slotConfig: Record<number, number>,
): PopularCategory[] {
  const byLevel = new Map<number, CategoryPopularityRow[]>();
  for (const row of rows) {
    const list = byLevel.get(row.credential_level);
    if (list) list.push(row);
    else byLevel.set(row.credential_level, [row]);
  }
  for (const list of byLevel.values()) {
    list.sort((a, b) => a.level_rank - b.level_rank);
  }

  const selected: CategoryPopularityRow[] = [];
  const selectedKeys = new Set<string>();
  let deficit = 0;

  for (const level of Object.keys(slotConfig).map(Number)) {
    const slots = slotConfig[level];
    const candidates = byLevel.get(level) ?? [];
    const take = candidates.slice(0, slots);
    for (const row of take) {
      selected.push(row);
      selectedKeys.add(categoryKey(row));
    }
    deficit += Math.max(0, slots - take.length);
  }

  if (deficit > 0) {
    const backfillPool = rows
      .filter((row) => !selectedKeys.has(categoryKey(row)))
      .sort(
        (a, b) =>
          b.popularity_score - a.popularity_score ||
          a.category_name.localeCompare(b.category_name),
      );

    for (const row of backfillPool) {
      if (deficit <= 0) break;
      selected.push(row);
      selectedKeys.add(categoryKey(row));
      deficit -= 1;
    }
  }

  // Stable display order: grouped by credential_level, most popular first
  // within each level (including any backfilled extras for that level).
  selected.sort((a, b) => {
    if (a.credential_level !== b.credential_level) {
      return a.credential_level - b.credential_level;
    }
    return b.popularity_score - a.popularity_score;
  });

  return selected.map((row, index) => ({
    category_id: row.category_id,
    category_name: row.category_name,
    credential_level: row.credential_level,
    popularity_score: row.popularity_score,
    sort_order: index + 1,
  }));
}
