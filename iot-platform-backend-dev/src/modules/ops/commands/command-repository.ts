import { query } from '../../../db/client';
import {
  type PaginationParams,
  buildPaginationClause,
  toLikePattern,
} from '../_internal/pagination';

export interface OpsCommandRow {
  id: string;
  deviceSn: string;
  operatorName: string;
  commandType: string;
  status: string;
  failureReason: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface OpsCommandFilters {
  search?: string;
  type?: string;
  status?: string;
}

const BASE_SELECT = `
  SELECT
    id,
    device_sn AS "deviceSn",
    operator_name AS "operatorName",
    command_type AS "commandType",
    status,
    failure_reason AS "failureReason",
    started_at AS "startedAt",
    finished_at AS "finishedAt"
  FROM command_audit
`;

export async function listOpsCommandRows(
  filters: OpsCommandFilters,
  pagination: PaginationParams
) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.search) {
    const pattern = toLikePattern(filters.search);
    conditions.push(
      `(id ILIKE $${paramIdx} OR device_sn ILIKE $${paramIdx} OR operator_name ILIKE $${paramIdx})`
    );
    params.push(pattern);
    paramIdx++;
  }

  if (filters.type) {
    conditions.push(`command_type = $${paramIdx}`);
    params.push(filters.type);
    paramIdx++;
  }

  if (filters.status) {
    conditions.push(`status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const { clause: paginationClause, params: paginationParams } =
    buildPaginationClause(pagination, paramIdx);
  params.push(...paginationParams);

  const sql = `${BASE_SELECT} ${where} ORDER BY created_at DESC ${paginationClause}`;

  const result = await query<OpsCommandRow>(sql, params);
  return result.rows;
}

export async function countOpsCommandRows(filters: OpsCommandFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.search) {
    const pattern = toLikePattern(filters.search);
    conditions.push(
      `(id ILIKE $${paramIdx} OR device_sn ILIKE $${paramIdx} OR operator_name ILIKE $${paramIdx})`
    );
    params.push(pattern);
    paramIdx++;
  }

  if (filters.type) {
    conditions.push(`command_type = $${paramIdx}`);
    params.push(filters.type);
    paramIdx++;
  }

  if (filters.status) {
    conditions.push(`status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sql = `SELECT COUNT(*) AS cnt FROM command_audit ${where}`;
  const result = await query<{ cnt: string }>(sql, params);
  return Number(result.rows[0].cnt);
}

export async function getOpsCommandRow(commandId: string) {
  const result = await query(
    `
      SELECT
        id,
        device_id AS "deviceId",
        device_sn AS "deviceSn",
        operator_type AS "operatorType",
        operator_name AS "operatorName",
        command_type AS "commandType",
        request_payload AS "requestPayload",
        response_payload AS "responsePayload",
        status,
        failure_reason AS "failureReason",
        started_at AS "startedAt",
        finished_at AS "finishedAt"
      FROM command_audit
      WHERE id = $1
      LIMIT 1
    `,
    [commandId]
  );

  return result.rows[0] || null;
}
