import { getDeviceLiveProperties, getDeviceRuntime, getDeviceShadow, refreshDeviceRuntime } from '../../iot/service';
import { HttpError } from '../../../shared/http';
import { mapDeviceRowToView } from '../_internal/device-view';
import { normalizePage, normalizePageSize } from '../_internal/pagination';
import { controlOpsDeviceByAdmin } from './device-mutations';
import {
  getOpsDeviceRow,
  listOpsDeviceAlertsByDeviceId,
  listOpsDeviceCommandsByDeviceId,
  listOpsDeviceHomes,
  listOpsDeviceRows,
  listOpsDeviceSharedUsers,
} from './device-repository';

function applyDeviceFilters(
  devices: ReturnType<typeof mapDeviceRowToView>[],
  filters: {
    search: string;
    status: string;
    online: string;
    model: string;
    country: string;
    province: string;
    city: string;
  }
) {
  return devices.filter((device) => {
    const matchesSearch = !filters.search
      || device.sn.toLowerCase().includes(filters.search)
      || device.name.toLowerCase().includes(filters.search)
      || device.ownerUid.toLowerCase().includes(filters.search)
      || device.ownerDisplayName.toLowerCase().includes(filters.search)
      || device.address.toLowerCase().includes(filters.search);
    const matchesStatus = !filters.status || device.status === filters.status;
    const matchesOnline = !filters.online
      || (filters.online === 'online' ? device.online : !device.online);
    const matchesModel = !filters.model || device.model === filters.model;
    const matchesCountry = !filters.country || device.country === filters.country;
    const matchesProvince = !filters.province || device.province === filters.province;
    const matchesCity = !filters.city || device.city === filters.city;

    return (
      matchesSearch
      && matchesStatus
      && matchesOnline
      && matchesModel
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

  const filtered = applyDeviceFilters(
    (await listOpsDeviceRows()).map((row) => mapDeviceRowToView(row)),
    { search, status, online, model, country, province, city }
  );

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
    },
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
  const runtime = await getDeviceRuntime(deviceId).catch(() => null);

  if (runtime) {
    return {
      temp: runtime.heatTemp ?? device.temp,
      gas: device.gas,
      smoke: device.smoke,
      flow: runtime.fuelConsumption ?? device.flow,
      fireLevel: device.fireLevel,
      fire: device.fire,
      valveStatus: device.valveStatus,
      humanDetected: device.humanDetected,
      vibration: device.vibration,
      locked: device.locked,
      online: runtime.cloudStatus ? runtime.cloudStatus.toUpperCase() === 'ONLINE' : device.online,
      runState: runtime.runState,
      errorCode: runtime.errorCode,
      roomTemp: runtime.roomTemp,
      collectedAt: runtime.lastSeenAt || runtime.reportedAt || device.lastHeartbeatAt || device.updatedAt,
    };
  }

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

export async function getOpsDeviceRuntime(deviceId: string) {
  return getDeviceRuntime(deviceId);
}

export async function refreshOpsDeviceRuntime(deviceId: string) {
  return refreshDeviceRuntime(deviceId);
}

export async function getOpsDeviceShadow(deviceId: string) {
  return getDeviceShadow(deviceId);
}

export async function getOpsDeviceLiveProperties(deviceId: string) {
  return getDeviceLiveProperties(deviceId);
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
