import { query } from '../../../database/client';

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

export async function listOpsCommandRows() {
  const result = await query<OpsCommandRow>(
    `
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
      ORDER BY created_at DESC
    `
  );

  return result.rows;
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
