import { query } from '../../../db/client';
import {
  type PaginationParams,
  buildPaginationClause,
  toLikePattern,
} from '../_internal/pagination';

export interface OpsAlertRow {
  id: string;
  deviceId: string;
  deviceSn: string;
  type: string;
  level: string;
  status: string;
  title: string;
  message: string;
  handlerName: string | null;
  triggeredAt: string;
  resolvedAt: string | null;
}

export interface OpsAlertFilters {
  search?: string;
  level?: string;
  status?: string;
}

const BASE_SELECT = `
  SELECT
    a.id,
    a.device_id AS "deviceId",
    a.device_sn AS "deviceSn",
    a.type,
    a.level,
    a.status,
    a.title,
    a.message,
    admin_user.display_name AS "handlerName",
    a.triggered_at AS "triggeredAt",
    a.resolved_at AS "resolvedAt"
  FROM alerts a
  LEFT JOIN admin_users admin_user
    ON admin_user.id = a.handler_admin_id
`;

export async function listOpsAlertRows(
  filters: OpsAlertFilters,
  pagination: PaginationParams
) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.search) {
    const pattern = toLikePattern(filters.search);
    conditions.push(
      `(a.device_sn ILIKE $${paramIdx} OR a.message ILIKE $${paramIdx} OR a.title ILIKE $${paramIdx})`
    );
    params.push(pattern);
    paramIdx++;
  }

  if (filters.level) {
    conditions.push(`a.level = $${paramIdx}`);
    params.push(filters.level);
    paramIdx++;
  }

  if (filters.status) {
    conditions.push(`a.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const { clause: paginationClause, params: paginationParams } =
    buildPaginationClause(pagination, paramIdx);
  params.push(...paginationParams);

  const sql = `${BASE_SELECT} ${where} ORDER BY a.triggered_at DESC ${paginationClause}`;

  const result = await query<OpsAlertRow>(sql, params);
  return result.rows;
}

export async function countOpsAlertRows(filters: OpsAlertFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.search) {
    const pattern = toLikePattern(filters.search);
    conditions.push(
      `(a.device_sn ILIKE $${paramIdx} OR a.message ILIKE $${paramIdx} OR a.title ILIKE $${paramIdx})`
    );
    params.push(pattern);
    paramIdx++;
  }

  if (filters.level) {
    conditions.push(`a.level = $${paramIdx}`);
    params.push(filters.level);
    paramIdx++;
  }

  if (filters.status) {
    conditions.push(`a.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sql = `SELECT COUNT(*) AS cnt FROM alerts a ${where}`;
  const result = await query<{ cnt: string }>(sql, params);
  return Number(result.rows[0].cnt);
}
