import { query, type DatabaseExecutor } from '../../../database/client';
import { type PaginatedQueryConfig, paginatedQuery } from '../common/pagination';

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

const ALERT_SELECT_FROM = `
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

export async function listOpsAlertRows() {
  const result = await query<OpsAlertRow>(
    `${ALERT_SELECT_FROM} ORDER BY a.triggered_at DESC`
  );

  return result.rows;
}

export async function paginatedOpsAlerts(page: number, pageSize: number, search: string, level: string, status: string) {
  return paginatedQuery<OpsAlertRow>(
    {
      selectFrom: ALERT_SELECT_FROM,
      searchColumns: ['a.device_sn', 'a.message', 'a.title'],
      filterColumns: {
        level: 'a.level',
        status: 'a.status',
      },
      orderBy: 'ORDER BY a.triggered_at DESC',
    },
    { page, pageSize, search, filters: { level, status } }
  );
}
