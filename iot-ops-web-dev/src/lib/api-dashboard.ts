import { api } from './api';
import type { PaginatedResponse } from './api-common';
import type { OpsDeviceItem } from './api-devices';

export interface OpsSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  alertDevices: number;
  todayNewDevices: number;
  activeAlerts: number;
}

export interface DashboardFilters {
  search?: string;
  status?: string;
  online?: string;
  country?: string;
  province?: string;
  city?: string;
}

export const dashboardApi = {
  summary(): Promise<{ summary: OpsSummary }> {
    return api.get<{ summary: OpsSummary }>('/ops/dashboard/summary');
  },

  listDevices(filters: DashboardFilters): Promise<PaginatedResponse<OpsDeviceItem>> {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '100');
    if (filters.search) query.set('search', filters.search);
    if (filters.status) query.set('status', filters.status);
    if (filters.online) query.set('online', filters.online);
    if (filters.country) query.set('country', filters.country);
    if (filters.province) query.set('province', filters.province);
    if (filters.city) query.set('city', filters.city);
    return api.get<PaginatedResponse<OpsDeviceItem>>(`/ops/devices?${query.toString()}`);
  },
};
