import { api } from './api';
import type { PaginatedResponse } from './api-common';

export interface OpsCommandAuditItem {
  id: string;
  deviceSn: string;
  operatorName: string;
  commandType: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  failureReason: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface CommandAuditFilters {
  search?: string;
  type?: string;
  status?: string;
}

export const commandsApi = {
  list(filters: CommandAuditFilters): Promise<PaginatedResponse<OpsCommandAuditItem>> {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '100');
    if (filters.search) query.set('search', filters.search);
    if (filters.type) query.set('type', filters.type);
    if (filters.status) query.set('status', filters.status);
    return api.get<PaginatedResponse<OpsCommandAuditItem>>(`/ops/commands?${query.toString()}`);
  },
};
