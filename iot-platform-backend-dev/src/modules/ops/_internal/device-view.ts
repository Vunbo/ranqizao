import {
  deriveLocationRegionPath,
  normalizeLocationData,
} from '../../../shared/location';

interface DeviceViewRowInput {
  id: string;
  sn: string | null;
  name: string;
  model: string | null;
  ownerUid: string;
  ownerDisplayName: string;
  firmwareVersion: string | null;
  inventoryStatus: string | null;
  location: unknown;
  isOn: boolean;
  fireLevel: number;
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
  locked: boolean;
  valveStatus: string;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeLocation(location: unknown) {
  const normalized = normalizeLocationData(location);

  return {
    ...normalized,
    regionPath: deriveLocationRegionPath(normalized),
  };
}

export function deriveOnline(lastHeartbeatAt: string | null) {
  if (!lastHeartbeatAt) {
    return false;
  }

  const timestamp = new Date(lastHeartbeatAt).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= 5 * 60 * 1000;
}

export function deriveDeviceStatus(input: {
  online: boolean;
  locked: boolean;
  gas: number;
  smoke: number;
  vibration: boolean;
}) {
  if (!input.online) {
    return 'offline';
  }

  if (input.locked) {
    return 'locked';
  }

  if (input.gas >= 0.1 || input.smoke >= 10 || input.vibration) {
    return 'alert';
  }

  return 'normal';
}

export function mapDeviceRowToView(row: DeviceViewRowInput) {
  const normalizedLocation = normalizeLocation(row.location);
  const online = deriveOnline(row.lastHeartbeatAt);
  const status = deriveDeviceStatus({
    online,
    locked: row.locked,
    gas: Number(row.gas || 0),
    smoke: Number(row.smoke || 0),
    vibration: Boolean(row.vibration),
  });

  return {
    id: row.id,
    sn: row.sn || '',
    name: row.name,
    model: row.model || '',
    ownerUid: row.ownerUid,
    ownerDisplayName: row.ownerDisplayName,
    firmwareVersion: row.firmwareVersion || '',
    inventoryStatus: row.inventoryStatus || '',
    online,
    status,
    fire: Boolean(row.isOn),
    fireStatus: row.isOn ? 'on' : 'off',
    fireLevel: Number(row.fireLevel || 0),
    temp: Number(row.temp || 0),
    gas: Number(row.gas || 0),
    smoke: Number(row.smoke || 0),
    flow: Number(row.flow || 0),
    humanDetected: Boolean(row.humanDetected),
    vibration: Boolean(row.vibration),
    locked: Boolean(row.locked),
    valveStatus: row.valveStatus || 'closed',
    lastHeartbeatAt: row.lastHeartbeatAt,
    region: normalizedLocation.regionPath || '\u672a\u77e5\u533a\u57df',
    country: normalizedLocation.country,
    province: normalizedLocation.province,
    city: normalizedLocation.city,
    district: normalizedLocation.district,
    address: normalizedLocation.address,
    latitude: normalizedLocation.latitude,
    longitude: normalizedLocation.longitude,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
