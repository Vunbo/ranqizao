import { query } from '../../../database/client';
import { HttpError } from '../../../shared/http';

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function listOpsCommands(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  type?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = Math.min(normalizePage(input.pageSize, 20), 100);
  const search = String(input.search || '').trim().toLowerCase();
  const type = String(input.type || '').trim();
  const status = String(input.status || '').trim();

  const result = await query<{
    id: string;
    deviceSn: string;
    operatorName: string;
    commandType: string;
    status: string;
    failureReason: string | null;
    startedAt: string;
    finishedAt: string | null;
  }>(
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

  const filtered = result.rows.filter((row) => {
    const matchesSearch = !search
      || row.id.toLowerCase().includes(search)
      || row.deviceSn.toLowerCase().includes(search)
      || row.operatorName.toLowerCase().includes(search);
    const matchesType = !type || row.commandType === type;
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesType && matchesStatus;
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize),
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function getOpsCommand(commandId: string) {
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

  const item = result.rows[0] || null;
  if (!item) {
    throw new HttpError(404, '审计记录不存在。');
  }

  return item;
}
