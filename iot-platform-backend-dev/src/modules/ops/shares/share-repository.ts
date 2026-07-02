import { query } from '../../../db/client';
import {
  type PaginationParams,
  buildPaginationClause,
  toLikePattern,
} from '../_internal/pagination';

export interface OpsShareRow {
  id: string;
  type: string;
  resourceId: string;
  resourceSn: string | null;
  resourceName: string;
  ownerUid: string;
  ownerDisplayName: string;
  sharedToUid: string;
  sharedToDisplayName: string;
  createdAt: string;
}

export interface OpsShareFilters {
  search?: string;
}

const BASE_SELECT = `
  SELECT
    ds.device_id || '-' || ds.user_id AS id,
    'device_share' AS type,
    d.id AS "resourceId",
    COALESCE(d.serial_number, di.serial_number) AS "resourceSn",
    d.name AS "resourceName",
    owner_user.short_uid AS "ownerUid",
    owner_user.display_name AS "ownerDisplayName",
    target_user.short_uid AS "sharedToUid",
    target_user.display_name AS "sharedToDisplayName",
    ds.created_at AS "createdAt"
  FROM device_shares ds
  INNER JOIN devices d
    ON d.id = ds.device_id
  INNER JOIN users owner_user
    ON owner_user.short_uid = d.owner_id
  INNER JOIN users target_user
    ON target_user.short_uid = ds.user_id
  LEFT JOIN device_inventory di
    ON di.id = d.inventory_id
`;

export async function listOpsShareRows(
  filters: OpsShareFilters,
  pagination: PaginationParams
) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.search) {
    const pattern = toLikePattern(filters.search);
    conditions.push(
      `(COALESCE(d.serial_number, di.serial_number) ILIKE $${paramIdx}
        OR d.name ILIKE $${paramIdx}
        OR owner_user.short_uid ILIKE $${paramIdx}
        OR owner_user.display_name ILIKE $${paramIdx}
        OR target_user.short_uid ILIKE $${paramIdx}
        OR target_user.display_name ILIKE $${paramIdx})`
    );
    params.push(pattern);
    paramIdx++;
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const { clause: paginationClause, params: paginationParams } =
    buildPaginationClause(pagination, paramIdx);
  params.push(...paginationParams);

  const sql = `${BASE_SELECT} ${where} ORDER BY ds.created_at DESC ${paginationClause}`;

  const result = await query<OpsShareRow>(sql, params);
  return result.rows;
}

export async function countOpsShareRows(filters: OpsShareFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.search) {
    const pattern = toLikePattern(filters.search);
    conditions.push(
      `(COALESCE(d.serial_number, di.serial_number) ILIKE $${paramIdx}
        OR d.name ILIKE $${paramIdx}
        OR owner_user.short_uid ILIKE $${paramIdx}
        OR owner_user.display_name ILIKE $${paramIdx}
        OR target_user.short_uid ILIKE $${paramIdx}
        OR target_user.display_name ILIKE $${paramIdx})`
    );
    params.push(pattern);
    paramIdx++;
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sql = `SELECT COUNT(*) AS cnt FROM device_shares ds
    INNER JOIN devices d ON d.id = ds.device_id
    INNER JOIN users owner_user ON owner_user.short_uid = d.owner_id
    INNER JOIN users target_user ON target_user.short_uid = ds.user_id
    LEFT JOIN device_inventory di ON di.id = d.inventory_id
    ${where}`;
  const result = await query<{ cnt: string }>(sql, params);
  return Number(result.rows[0].cnt);
}

