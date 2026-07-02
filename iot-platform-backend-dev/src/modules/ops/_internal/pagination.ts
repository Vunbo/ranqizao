export function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function normalizePageSize(value: unknown, fallback: number, max = 100) {
  return Math.min(normalizePage(value, fallback), max);
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Build a `LIMIT $N OFFSET $M` SQL clause and the corresponding parameter array.
 *
 * @param pagination - The normalised page and pageSize values.
 * @param paramIndexStart - The next free `$N` index (1-based). Pass the index
 *   after the last filter parameter.
 * @returns The clause string, params array, and the next free parameter index.
 *
 * @example
 * ```ts
 * const { clause, params, nextIndex } = buildPaginationClause(
 *   { page: 2, pageSize: 20 }, 4
 * );
 * // clause  → "LIMIT $4 OFFSET $5"
 * // params  → [20, 20]
 * // nextIndex → 6
 * ```
 */
export function buildPaginationClause(
  pagination: PaginationParams,
  paramIndexStart: number
): { clause: string; params: number[]; nextIndex: number } {
  const limit = pagination.pageSize;
  const offset = (pagination.page - 1) * pagination.pageSize;

  const clause = `LIMIT $${paramIndexStart} OFFSET $${paramIndexStart + 1}`;

  return {
    clause,
    params: [limit, offset],
    nextIndex: paramIndexStart + 2,
  };
}

/**
 * Sanitise a search string for use with `ILIKE` by escaping `%` and `_`
 * wildcard characters, then wrapping in `%...%` for a partial match.
 */
export function toLikePattern(raw: string): string {
  return `%${raw.replace(/[%_]/g, '\\$&')}%`;
}

/**
 * Normalise a single filter value from an unknown input to a trimmed string.
 * Returns the empty string when the value is falsy or whitespace-only, making
 * it easy to skip unused filters.
 */
export function normaliseFilterValue(value: unknown): string {
  return String(value || '').trim();
}

/**
 * Build a `$N` parameter reference string for the given index.
 */
export function paramRef(n: number): string {
  return `$${n}`;
}
