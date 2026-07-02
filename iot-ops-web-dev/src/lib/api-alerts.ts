import { api } from './api';
import type { PaginatedResponse } from './api-common';

export interface OpsAlertListItem {
  id: string;
  deviceId: string;
  deviceSn: string;
  type: string;
  level: 'critical' | 'high' | 'normal';
  status: 'pending' | 'resolved' | 'false_positive';
  title: string;
  message: string;
  handlerName: string;
  triggeredAt: string;
  resolvedAt: string | null;
}

export interface AlertListFilters {
  search?: string;
  level?: string;
  status?: string;
}

export const alertsApi = {
  list(filters: AlertListFilters): Promise<PaginatedResponse<OpsAlertListItem>> {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '100');
    if (filters.search) query.set('search', filters.search);
    if (filters.level) query.set('level', filters.level);
    if (filters.status) query.set('status', filters.status);
    return api.get<PaginatedResponse<OpsAlertListItem>>(`/ops/alerts?${query.toString()}`);
  },

  resolve(id: string, comment: string): Promise<void> {
    return api.patch(`/ops/alerts/${id}/resolve`, { comment });
  },

  markFalsePositive(id: string, comment: string): Promise<void> {
    return api.patch(`/ops/alerts/${id}/false-positive`, { comment });
  },
};
