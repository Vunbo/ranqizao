export interface AppRuntimeConfig {
  apiBaseUrl: string;
}

const DEFAULT_RUNTIME_CONFIG: AppRuntimeConfig = {
  apiBaseUrl: 'http://localhost:3001/api',
};

let runtimeConfig: AppRuntimeConfig | null = null;
let runtimeConfigPromise: Promise<AppRuntimeConfig> | null = null;

function normalizeBaseUrl(value?: string) {
  return (value || DEFAULT_RUNTIME_CONFIG.apiBaseUrl).replace(/\/$/, '');
}

function toRuntimeConfig(payload?: Partial<AppRuntimeConfig> | null): AppRuntimeConfig {
  return {
    apiBaseUrl: normalizeBaseUrl(payload?.apiBaseUrl),
  };
}

async function loadRuntimeConfig() {
  try {
    const response = await fetch('/runtime-config.json', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to load runtime config: ${response.status}`);
    }

    const payload = (await response.json()) as Partial<AppRuntimeConfig>;
    runtimeConfig = toRuntimeConfig(payload);
  } catch (error) {
    console.warn('Failed to load runtime config, using default config.', error);
    runtimeConfig = { ...DEFAULT_RUNTIME_CONFIG };
  }

  return runtimeConfig;
}

export async function initializeRuntimeConfig() {
  if (runtimeConfig) {
    return runtimeConfig;
  }

  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadRuntimeConfig();
  }

  return runtimeConfigPromise;
}

export function getRuntimeConfig() {
  if (!runtimeConfig) {
    throw new Error('Runtime config has not been initialized.');
  }

  return runtimeConfig;
}
