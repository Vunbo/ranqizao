type RuntimeImportMeta = ImportMeta & {
  env?: Record<string, string | boolean | undefined>;
};

export function getApiBaseUrl() {
  const runtimeImportMeta = import.meta as RuntimeImportMeta;
  const value = String(runtimeImportMeta.env?.VITE_API_BASE_URL || 'http://localhost:3001/api').trim();
  return value.replace(/\/$/, '');
}

export function buildApiUrl(path: string) {
  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
