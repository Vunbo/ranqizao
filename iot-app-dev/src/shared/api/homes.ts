import type { Home } from '../types';
import { apiFetch } from './client';

export const homesApi = {
  async list() {
    const response = await apiFetch<{ homes: Home[] }>('/homes');
    return response.homes;
  },

  async create(name: string) {
    const response = await apiFetch<{ home: Home }>('/homes', {
      method: 'POST',
      body: { name },
    });
    return response.home;
  },

  async remove(homeId: string) {
    await apiFetch(`/homes/${homeId}`, { method: 'DELETE' });
  },

  async updateDeviceLinks(homeId: string, deviceIds: string[]) {
    await apiFetch(`/homes/${homeId}/device-links`, {
      method: 'PATCH',
      body: { deviceIds },
    });
  },

  async addMember(homeId: string, userId: string) {
    await apiFetch(`/homes/${homeId}/members`, {
      method: 'POST',
      body: { userId },
    });
  },

  async removeMembers(homeId: string, userIds: string[]) {
    await apiFetch(`/homes/${homeId}/members`, {
      method: 'DELETE',
      body: { userIds },
    });
  },
};
