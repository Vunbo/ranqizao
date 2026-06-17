import { query } from '../../../database/client';

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

// ---------------------------------------------------------------------------
// Parameterized pagination builder — pushes filtering + pagination to SQL
// ---------------------------------------------------------------------------

export interface PaginatedQueryConfig<T> {
  /** The base SELECT + FROM clause (e.g. "SELECT a.*, b.name FROM alerts a LEFT JOIN ...") */
  selectFrom: string;
  /** Column names that should be searched via ILIKE when `search` is non-empty */
  searchColumns: string[];
  /** Maps input filter keys to SQL column expressions. Only columns with non-empty filter values are added to WHERE. */
  filterColumns: Record<string, string>;
  /** ORDER BY clause (e.g. "a.triggered_at DESC") */
  orderBy: string;
  /** Optional row mapper applied to each returned row */
  mapper?: (row: T) => T;
}

export interface PaginatedInput {
  page: number;
  pageSize: number;
  search: string;
  filters: Record<string, string>;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export async function paginatedQuery<T>(
  config: PaginatedQueryConfig<T>,
  input: PaginatedInput
): Promise<PaginatedResult<T>> {
  const { selectFrom, searchColumns, filterColumns, orderBy, mapper } = config;
  const { page, pageSize, search, filters } = input;

  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 0;

  // Build ILIKE search across configured columns
  if (search) {
    const searchClauses = searchColumns.map((col) => {
      paramIndex += 1;
      params.push(`%${search}%`);
      return `${col} ILIKE $${paramIndex}`;
    });
    whereClauses.push(`(${searchClauses.join(' OR ')})`);
  }

  // Build exact-match filters
  for (const [filterKey, columnExpr] of Object.entries(filterColumns)) {
    const value = filters[filterKey];
    if (value) {
      paramIndex += 1;
      params.push(value);
      whereClauses.push(`${columnExpr} = $${paramIndex}`);
    }
  }

  const whereSQL = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  // Count total
  const countSQL = `SELECT COUNT(*)::INT AS "total" FROM (${selectFrom}) AS _src ${whereSQL}`;
  const countResult = await query<{ total: number }>(countSQL, params);
  const total = countResult.rows[0]?.total ?? 0;

  // Fetch page
  const offset = (page - 1) * pageSize;
  paramIndex += 1;
  params.push(pageSize);
  paramIndex += 1;
  params.push(offset);

  const dataSQL = `${selectFrom} ${whereSQL} ${orderBy} LIMIT $${paramIndex - 1} OFFSET $${paramIndex}`;
  const dataResult = await query<T>(dataSQL, params);

  const items = mapper ? dataResult.rows.map(mapper) : dataResult.rows;

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}
