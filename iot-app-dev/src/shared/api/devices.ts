import type { Device, OperationLog } from '../types';
import { apiFetch } from './client';

export const devicesApi = {
  async list() {
    const response = await apiFetch<{ devices: Device[] }>('/devices');
    return response.devices;
  },

  async create(payload: {
    name: string;
    location?: Device['location'];
  }) {
    const response = await apiFetch<{ device: Device }>('/devices', {
      method: 'POST',
      body: payload,
    });
    return response.device;
  },

  async update(deviceId: string, payload: Partial<Device>) {
    const response = await apiFetch<{ device: Device }>(`/devices/${deviceId}`, {
      method: 'PATCH',
      body: payload,
    });
    return response.device;
  },

  async remove(deviceId: string) {
    await apiFetch(`/devices/${deviceId}`, { method: 'DELETE' });
  },

  async listLogs(deviceId: string) {
    const response = await apiFetch<{ logs: OperationLog[] }>(
      `/devices/${deviceId}/logs`
    );
    return response.logs;
  },

  async createLog(
    deviceId: string,
    payload: { event: string; type?: OperationLog['type'] }
  ) {
    const response = await apiFetch<{ log: OperationLog }>(
      `/devices/${deviceId}/logs`,
      {
        method: 'POST',
        body: payload,
      }
    );
    return response.log;
  },

  async share(deviceId: string, userId: string) {
    await apiFetch(`/devices/${deviceId}/share`, {
      method: 'POST',
      body: { userId },
    });
  },

  async unshare(deviceId: string, userId: string) {
    await apiFetch(`/devices/${deviceId}/share/${userId}`, {
      method: 'DELETE',
    });
  },
};
