import { query } from '../../../database/client';
import { type AdminAuthUser } from '../../../shared/admin-auth';
import { HttpError } from '../../../shared/http';

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function listOpsAlerts(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  level?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = Math.min(normalizePage(input.pageSize, 20), 100);
  const search = String(input.search || '').trim().toLowerCase();
  const level = String(input.level || '').trim();
  const status = String(input.status || '').trim();

  const result = await query<{
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
  }>(
    `
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
      ORDER BY a.triggered_at DESC
    `
  );

  const filtered = result.rows.filter((row) => {
    const matchesSearch = !search
      || row.deviceSn.toLowerCase().includes(search)
      || row.message.toLowerCase().includes(search)
      || row.title.toLowerCase().includes(search);
    const matchesLevel = !level || row.level === level;
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesLevel && matchesStatus;
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize).map((row) => ({
      ...row,
      handlerName: row.handlerName || '-',
    })),
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function resolveOpsAlert(alertId: string, admin: AdminAuthUser, comment: string) {
  const result = await query(
    `
      UPDATE alerts
      SET
        status = 'resolved',
        is_false_positive = FALSE,
        handler_admin_id = $2,
        handler_comment = $3,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [alertId, admin.adminId, comment || null]
  );

  if (!result.rowCount) {
    throw new HttpError(404, '告警不存在。');
  }

  return { ok: true };
}

export async function markOpsAlertFalsePositive(alertId: string, admin: AdminAuthUser, comment: string) {
  const result = await query(
    `
      UPDATE alerts
      SET
        status = 'false_positive',
        is_false_positive = TRUE,
        handler_admin_id = $2,
        handler_comment = $3,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [alertId, admin.adminId, comment || null]
  );

  if (!result.rowCount) {
    throw new HttpError(404, '告警不存在。');
  }

  return { ok: true };
}
