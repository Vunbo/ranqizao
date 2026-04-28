import { query } from '../../../database/client';
import { deriveDeviceStatus, deriveOnline, normalizeLocation } from '../common/device-view';

interface DashboardDeviceRow {
  id: string;
  location: unknown;
  gas: number;
  smoke: number;
  vibration: boolean;
  locked: boolean;
  lastHeartbeatAt: string | null;
  createdAt: string;
}

export async function getOpsDashboardSummary() {
  const devicesResult = await query<DashboardDeviceRow>(
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

  const now = new Date();
  let onlineDevices = 0;
  let offlineDevices = 0;
  let alertDevices = 0;
  let todayNewDevices = 0;

  for (const row of devicesResult.rows) {
    const online = deriveOnline(row.lastHeartbeatAt);
    const status = deriveDeviceStatus({
      online,
      locked: row.locked,
      gas: Number(row.gas || 0),
      smoke: Number(row.smoke || 0),
      vibration: Boolean(row.vibration),
    });

    if (online) {
      onlineDevices += 1;
    } else {
      offlineDevices += 1;
    }

    if (status === 'alert') {
      alertDevices += 1;
    }

    const createdAt = new Date(row.createdAt);
    if (
      createdAt.getFullYear() === now.getFullYear()
      && createdAt.getMonth() === now.getMonth()
      && createdAt.getDate() === now.getDate()
    ) {
      todayNewDevices += 1;
    }
  }

  const alertsResult = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM alerts WHERE status = 'pending'"
  );

  return {
    totalDevices: devicesResult.rows.length,
    onlineDevices,
    offlineDevices,
    alertDevices,
    todayNewDevices,
    activeAlerts: Number(alertsResult.rows[0]?.count || 0),
  };
}

export async function getOpsDashboardMap(input: {
  level?: unknown;
  country?: unknown;
  province?: unknown;
}) {
  const level = String(input.level || 'province').trim();
  const country = String(input.country || '').trim();
  const province = String(input.province || '').trim();

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

  const bucketMap = new Map<string, { total: number; online: number; offline: number; alert: number }>();

  for (const row of result.rows) {
    const normalizedLocation = normalizeLocation(row.location);
    const online = deriveOnline(row.lastHeartbeatAt);
    const status = deriveDeviceStatus({
      online,
      locked: row.locked,
      gas: Number(row.gas || 0),
      smoke: Number(row.smoke || 0),
      vibration: Boolean(row.vibration),
    });

    if (country && normalizedLocation.country && normalizedLocation.country !== country) {
      continue;
    }

    if (province && normalizedLocation.province && normalizedLocation.province !== province) {
      continue;
    }

    const bucketName =
      level === 'city'
        ? normalizedLocation.city || '未知城市'
        : normalizedLocation.province || '未知区域';

    if (!bucketMap.has(bucketName)) {
      bucketMap.set(bucketName, {
        total: 0,
        online: 0,
        offline: 0,
        alert: 0,
      });
    }

    const bucket = bucketMap.get(bucketName)!;
    bucket.total += 1;
    if (online) {
      bucket.online += 1;
    } else {
      bucket.offline += 1;
    }
    if (status === 'alert') {
      bucket.alert += 1;
    }
  }

  return {
    level,
    items: Array.from(bucketMap.entries()).map(([name, stats]) => ({
      name,
      total: stats.total,
      online: stats.online,
      offline: stats.offline,
      alert: stats.alert,
    })),
  };
}
