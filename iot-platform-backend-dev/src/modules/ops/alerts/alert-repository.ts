import { query } from '../../../database/client';

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

export async function listOpsAlertRows() {
  const result = await query<OpsAlertRow>(
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

  return result.rows;
}
