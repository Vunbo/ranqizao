import { query } from '../../../database/client';
import { paginatedQuery } from '../common/pagination';

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

const COMMAND_SELECT_FROM = `
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

export async function listOpsCommandRows() {
  const result = await query<OpsCommandRow>(
    `${COMMAND_SELECT_FROM} ORDER BY created_at DESC`
  );

  return result.rows;
}

export async function paginatedOpsCommands(page: number, pageSize: number, search: string, type: string, status: string) {
  return paginatedQuery<OpsCommandRow>(
    {
      selectFrom: COMMAND_SELECT_FROM,
      searchColumns: ['id::text', 'device_sn', 'operator_name'],
      filterColumns: {
        type: 'command_type',
        status: 'status',
      },
      orderBy: 'ORDER BY created_at DESC',
    },
    { page, pageSize, search, filters: { type, status } }
  );
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
