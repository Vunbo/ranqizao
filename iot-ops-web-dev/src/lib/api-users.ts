import { api } from './api';
import type { PaginatedResponse } from './api-common';

export interface OpsUserListItem {
  uid: string;
  shortUid: string;
  displayName: string;
  phone: string;
  email: string;
  avatar: string;
  status: string;
  createdAt: string;
}

export interface OpsUserDetailResponse {
  uid: string;
  shortUid: string;
  displayName: string;
  phone: string;
  email: string;
  avatar: string;
  status: string;
  createdAt: string;
  devices: { id: string; name: string; sn: string }[];
  sharedDevices: { id: string; name: string; sn: string; shareType: string }[];
}

export interface OpsShareItem {
  id: string;
  type: string;
  resourceId: string;
  resourceSn: string;
  resourceName: string;
  ownerUid: string;
  ownerDisplayName: string;
  sharedToUid: string;
  sharedToDisplayName: string;
  permissions: string[];
  expiry: string | null;
  createdAt: string;
}

export interface UserListFilters {
  search?: string;
  status?: string;
}

export const usersApi = {
  list(filters: UserListFilters): Promise<PaginatedResponse<OpsUserListItem>> {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '100');
    if (filters.search) query.set('search', filters.search);
    if (filters.status) query.set('status', filters.status);
    return api.get<PaginatedResponse<OpsUserListItem>>(`/ops/users?${query.toString()}`);
  },

  detail(uid: string): Promise<OpsUserDetailResponse> {
    return api.get<OpsUserDetailResponse>(`/ops/users/${uid}`);
  },
};

export const sharesApi = {
  list(filters: { search?: string }): Promise<PaginatedResponse<OpsShareItem>> {
    const query = new URLSearchParams();
    query.set('page', '1');
    query.set('pageSize', '100');
    if (filters.search) query.set('search', filters.search);
    return api.get<PaginatedResponse<OpsShareItem>>(`/ops/shares?${query.toString()}`);
  },
};
