import { HttpError } from '../../../shared/http';
import { mapDeviceRowToView } from '../common/device-view';
import { normalizePage, normalizePageSize } from '../common/pagination';
import { controlOpsDeviceByAdmin } from './device-mutations';
import {
  getOpsDeviceRow,
  listOpsDeviceAlertsByDeviceId,
  listOpsDeviceCommandsByDeviceId,
  listOpsDeviceHomes,
  paginatedOpsDevices,
  listOpsDeviceSharedUsers,
} from './device-repository';

type DeviceView = ReturnType<typeof mapDeviceRowToView>;

function applyDerivedFilters(
  devices: DeviceView[],
  filters: {
    status: string;
    online: string;
    country: string;
    province: string;
    city: string;
  }
) {
  return devices.filter((device) => {
    const matchesStatus = !filters.status || device.status === filters.status;
    const matchesOnline = !filters.online
      || (filters.online === 'online' ? device.online : !device.online);
    const matchesCountry = !filters.country || device.country === filters.country;
    const matchesProvince = !filters.province || device.province === filters.province;
    const matchesCity = !filters.city || device.city === filters.city;

    return (
      matchesStatus
      && matchesOnline
      && matchesCountry
      && matchesProvince
      && matchesCity
    );
  });
}

export async function listOpsDevices(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  status?: unknown;
  online?: unknown;
  model?: unknown;
  country?: unknown;
  province?: unknown;
  city?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = String(input.search || '').trim().toLowerCase();
  const status = String(input.status || '').trim();
  const online = String(input.online || '').trim();
  const model = String(input.model || '').trim();
  const country = String(input.country || '').trim();
  const province = String(input.province || '').trim();
  const city = String(input.city || '').trim();

  // Derived filters that can't be pushed to SQL (computed from raw columns)
  const hasDerivedFilters = !!(status || online || country || province || city);

  if (hasDerivedFilters) {
    // Fetch a larger page to account for post-filter attrition, then apply derived filters
    const result = await paginatedOpsDevices(page, pageSize * 3, search, model);
    const views = result.items.map((row) => mapDeviceRowToView(row));
    const filtered = applyDerivedFilters(views, { status, online, country, province, city });

    return {
      items: filtered.slice(0, pageSize),
      pagination: {
        page,
        pageSize,
        total: filtered.length, // best-effort: only counts the fetched batch
      },
    };
  }

  // All filters pushed to SQL — efficient path
  const result = await paginatedOpsDevices(page, pageSize, search, model);

  return {
    items: result.items.map((row) => mapDeviceRowToView(row)),
    pagination: result.pagination,
  };
}

export async function getOpsDevice(deviceId: string) {
  const row = await getOpsDeviceRow(deviceId);
  if (!row) {
    throw new HttpError(404, '设备不存在。');
  }

  const device = mapDeviceRowToView(row);
  const [sharedUsers, homes] = await Promise.all([
    listOpsDeviceSharedUsers(deviceId),
    listOpsDeviceHomes(deviceId),
  ]);

  return {
    device,
    owner: {
      uid: device.ownerUid,
      displayName: device.ownerDisplayName,
    },
    sharedUsers,
    homes,
  };
}

export async function getOpsDeviceRealtimeMetrics(deviceId: string) {
  const { device } = await getOpsDevice(deviceId);

  return {
    temp: device.temp,
    gas: device.gas,
    smoke: device.smoke,
    flow: device.flow,
    fireLevel: device.fireLevel,
    fire: device.fire,
    valveStatus: device.valveStatus,
    humanDetected: device.humanDetected,
    vibration: device.vibration,
    locked: device.locked,
    online: device.online,
    collectedAt: device.lastHeartbeatAt || device.updatedAt,
  };
}

export async function getOpsDeviceCommands(deviceId: string) {
  return listOpsDeviceCommandsByDeviceId(deviceId);
}

export async function getOpsDeviceAlerts(deviceId: string) {
  return listOpsDeviceAlertsByDeviceId(deviceId);
}

export async function controlOpsDevice(input: {
  deviceId: string;
  adminId: string;
  adminName: string;
  command: string;
  reason?: string;
}) {
  return controlOpsDeviceByAdmin(input);
}
