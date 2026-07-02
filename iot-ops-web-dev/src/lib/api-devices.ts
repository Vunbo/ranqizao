import { api } from './api';
import type { PaginatedResponse } from './api-common';

export interface OpsDeviceItem {
  id: string;
  sn: string;
  name: string;
  model: string;
  ownerUid: string;
  ownerDisplayName: string;
  firmwareVersion: string;
  inventoryStatus: string;
  online: boolean;
  status: 'normal' | 'alert' | 'locked' | 'offline';
  fire: boolean;
  fireStatus: 'on' | 'off';
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
  region: string;
  country: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsDeviceDetailResponse {
  device: OpsDeviceItem;
  owner: { uid: string; displayName: string } | null;
  sharedUsers: string[];
  home: { id: string; name: string } | null;
}

export interface OpsDeviceMetrics {
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
  fire: boolean;
  fireLevel: number;
  fireStatus: string;
  online: boolean;
  valveStatus: string;
  locked: boolean;
  lastHeartbeatAt: string;
}

export interface OpsDeviceAlert {
  id: string;
  level: string;
  title: string;
  message: string;
  status: string;
  triggeredAt: string;
}

export interface OpsDeviceCommand {
  id: string;
  commandType: string;
  status: string;
  operatorName: string;
  startedAt: string;
}

export type DeviceControlCommand = 'lock_device' | 'unlock_device' | 'ignite' | 'shutdown';

export interface DeviceListFilters {
  search?: string;
  status?: string;
  model?: string;
}

export const devicesApi = {
  list(filters: DeviceListFilters): Promise<PaginatedResponse<OpsDeviceItem>> {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '100');
    if (filters.search) query.set('search', filters.search);
    if (filters.status) query.set('status', filters.status);
    if (filters.model) query.set('model', filters.model);
    return api.get<PaginatedResponse<OpsDeviceItem>>(`/ops/devices?${query.toString()}`);
  },

  detail(deviceId: string): Promise<OpsDeviceDetailResponse> {
    return api.get<OpsDeviceDetailResponse>(`/ops/devices/${deviceId}`);
  },

  metrics(deviceId: string): Promise<{ metrics: OpsDeviceMetrics }> {
    return api.get<{ metrics: OpsDeviceMetrics }>(`/ops/devices/${deviceId}/metrics/realtime`);
  },

  alerts(deviceId: string): Promise<{ items: OpsDeviceAlert[] }> {
    return api.get<{ items: OpsDeviceAlert[] }>(`/ops/devices/${deviceId}/alerts`);
  },

  commands(deviceId: string): Promise<{ items: OpsDeviceCommand[] }> {
    return api.get<{ items: OpsDeviceCommand[] }>(`/ops/devices/${deviceId}/commands`);
  },

  control(deviceId: string, command: DeviceControlCommand): Promise<void> {
    return api.post(`/ops/devices/${deviceId}/control`, {
      command,
      reason: '运维中台人工控制',
    });
  },
};
