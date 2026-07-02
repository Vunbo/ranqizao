import { deriveDeviceStatus, deriveOnline, normalizeLocation } from '../_internal/device-view';
import { countPendingAlerts, listDashboardDeviceRows } from './dashboard-repository';

export async function getOpsDashboardSummary() {
  const devices = await listDashboardDeviceRows();
  const now = new Date();
  let onlineDevices = 0;
  let offlineDevices = 0;
  let alertDevices = 0;
  let todayNewDevices = 0;

  for (const row of devices) {
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

  return {
    totalDevices: devices.length,
    onlineDevices,
    offlineDevices,
    alertDevices,
    todayNewDevices,
    activeAlerts: await countPendingAlerts(),
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
  const devices = await listDashboardDeviceRows();
  const bucketMap = new Map<string, { total: number; online: number; offline: number; alert: number }>();

  for (const row of devices) {
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
