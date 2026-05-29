import { query } from '../../../database/client';

export interface DashboardDeviceRow {
  id: string;
  location: unknown;
  gas: number;
  smoke: number;
  vibration: boolean;
  locked: boolean;
  lastHeartbeatAt: string | null;
  createdAt: string;
}

export async function listDashboardDeviceRows() {
  const result = await query<DashboardDeviceRow>(
    `
      SELECT
        d.id,
        d.location,
        d.gas,
        d.smoke,
        d.vibration,
        d.locked,
        d.last_heartbeat_at AS "lastHeartbeatAt",
        d.created_at AS "createdAt"
      FROM devices d
    `
  );

  return result.rows;
}

export async function countPendingAlerts() {
  const result = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM alerts WHERE status = 'pending'"
  );

  return Number(result.rows[0]?.count || 0);
}
