import { getRuntimeConfig } from '../config/runtime-config';

const AUTH_TOKEN_KEY = 'ai-iot-safety-stove-control.auth-token';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export function getAuthToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function notifyAuthChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event('auth-changed'));
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  notifyAuthChanged();
}

export function clearAuthToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  notifyAuthChanged();
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  const { apiBaseUrl } = getRuntimeConfig();

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const errorPayload = await response
      .json()
      .catch(() => ({ message: '\u8bf7\u6c42\u5931\u8d25\u3002' }));

    throw new Error(errorPayload.message || '\u8bf7\u6c42\u5931\u8d25\u3002');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
