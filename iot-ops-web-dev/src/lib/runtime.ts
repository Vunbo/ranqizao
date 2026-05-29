type RuntimeImportMeta = ImportMeta & {
  env?: Record<string, string | boolean | undefined>;
};

const DEFAULT_API_BASE_URL = 'http://localhost:3001/api';

function normalizeBaseUrl(value: string) {
  return String(value || '').trim().replace(/\/$/, '');
}

export function getApiBaseUrl() {
  const runtimeImportMeta = import.meta as RuntimeImportMeta;
  const rawValue =
    runtimeImportMeta.env?.VITE_API_BASE_URL ||
    runtimeImportMeta.env?.VITE_APP_API_BASE_URL ||
    DEFAULT_API_BASE_URL;

  return normalizeBaseUrl(String(rawValue));
}

export function buildApiUrl(path: string) {
  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
