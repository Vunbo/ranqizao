import type { FirebaseUser } from '../types';
import { apiFetch, clearAuthToken, setAuthToken } from './client';

interface AuthResponse {
  token: string;
  user: FirebaseUser;
}

export const authApi = {
  async register(payload: {
    email: string;
    password: string;
    displayName?: string;
  }) {
    const response = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: payload,
    });

    setAuthToken(response.token);
    return response.user;
  },

  async login(payload: { email: string; password: string }) {
    const response = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: payload,
    });

    setAuthToken(response.token);
    return response.user;
  },

  async getCurrentUser() {
    const response = await apiFetch<{ user: FirebaseUser }>('/auth/me');
    return response.user;
  },

  async logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      clearAuthToken();
    }
  },
};
