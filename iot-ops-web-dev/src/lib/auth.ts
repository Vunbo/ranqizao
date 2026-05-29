import type { OpsAuthUser } from '../types';

const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'user';

export interface OpsAuthSession {
  token: string;
  user: OpsAuthUser;
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key) || '';
  } catch (_error) {
    return '';
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (_error) {
    // Ignore storage write failures so the UI can surface the real auth error path.
  }
}

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (_error) {
    // Ignore storage cleanup failures during logout fallback.
  }
}

export function getAuthToken() {
  return readStorage(TOKEN_STORAGE_KEY);
}

export function hasAuthToken() {
  return Boolean(getAuthToken());
}

export function getStoredAuthUser(): OpsAuthUser | null {
  const stored = readStorage(USER_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as OpsAuthUser;
  } catch (_error) {
    return null;
  }
}

export function persistAuthSession(session: OpsAuthSession) {
  writeStorage(TOKEN_STORAGE_KEY, session.token);
  writeStorage(USER_STORAGE_KEY, JSON.stringify(session.user));
}

export function clearAuthSession() {
  removeStorage(TOKEN_STORAGE_KEY);
  removeStorage(USER_STORAGE_KEY);
}
