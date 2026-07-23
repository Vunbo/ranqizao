import './env';

function readString(name: string, fallback = '') {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function readNumber(name: string, fallback: number) {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }

  return parsed;
}

function readBoolean(name: string, fallback: boolean) {
  const rawValue = process.env[name]?.trim().toLowerCase();
  if (!rawValue) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(rawValue)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(rawValue)) {
    return false;
  }

  throw new Error(`Environment variable ${name} must be a valid boolean.`);
}

export const iotEnv = {
  enabled: readBoolean('HUAWEI_IOTDA_ENABLED', false),
  endpoint: readString('HUAWEI_IOTDA_ENDPOINT'),
  region: readString('HUAWEI_IOTDA_REGION'),
  instanceId: readString('HUAWEI_IOTDA_INSTANCE_ID'),
  resourceSpaceId: readString('HUAWEI_IOTDA_RESOURCE_SPACE_ID'),
  serviceId: readString('HUAWEI_IOTDA_SERVICE_ID', 'GasStoveBasic'),
  signingService: readString('HUAWEI_IOTDA_SIGNING_SERVICE', 'iotda'),
  runtimeCacheTtlMs: readNumber('HUAWEI_IOTDA_RUNTIME_CACHE_TTL_MS', 15000),
  commandTimeoutMs: readNumber('HUAWEI_IOTDA_COMMAND_TIMEOUT_MS', 8000),
  callbackSecret: readString('HUAWEI_IOTDA_CALLBACK_SECRET'),
  credentials: {
    accessKey: readString('HUAWEI_CLOUD_AK'),
    secretKey: readString('HUAWEI_CLOUD_SK'),
    projectId: readString('HUAWEI_CLOUD_PROJECT_ID'),
  },
};

export function isIotIntegrationEnabled() {
  return Boolean(
    iotEnv.enabled
      && iotEnv.endpoint
      && iotEnv.region
      && iotEnv.credentials.projectId
      && iotEnv.credentials.accessKey
      && iotEnv.credentials.secretKey
  );
}

export interface IotConfigDiagnostics {
  enabled: boolean;
  errors: string[];
  warnings: string[];
}

function isHuaweiCloudHost(hostname: string) {
  const value = hostname.toLowerCase();
  return (
    value.includes('huaweicloud.com')
    || value.includes('myhuaweicloud.com')
    || value.includes('huaweicloud.cn')
    || value.includes('myhwclouds.com')
  );
}

export function getIotConfigDiagnostics(): IotConfigDiagnostics {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!iotEnv.enabled) {
    return {
      enabled: false,
      errors,
      warnings,
    };
  }

  if (!iotEnv.endpoint) {
    errors.push('HUAWEI_IOTDA_ENDPOINT is required when IoT integration is enabled.');
  } else {
    try {
      const endpoint = new URL(iotEnv.endpoint);
      if (endpoint.protocol !== 'https:') {
        errors.push('HUAWEI_IOTDA_ENDPOINT must use https.');
      }

      if (!isHuaweiCloudHost(endpoint.hostname)) {
        warnings.push(
          'HUAWEI_IOTDA_ENDPOINT is not a Huawei Cloud domain. Use this only when the app-side IoTDA API has been exposed through your own reverse proxy or custom domain.'
        );
      }
    } catch {
      errors.push('HUAWEI_IOTDA_ENDPOINT must be a valid absolute URL, for example https://xxx.myhuaweicloud.com.');
    }
  }

  if (!iotEnv.region) {
    errors.push('HUAWEI_IOTDA_REGION is required when IoT integration is enabled.');
  }

  if (!iotEnv.serviceId) {
    errors.push('HUAWEI_IOTDA_SERVICE_ID is required when IoT integration is enabled.');
  }

  if (!iotEnv.signingService) {
    errors.push('HUAWEI_IOTDA_SIGNING_SERVICE is required when IoT integration is enabled.');
  }

  if (!iotEnv.credentials.projectId) {
    errors.push('HUAWEI_CLOUD_PROJECT_ID is required when IoT integration is enabled.');
  }

  if (!iotEnv.credentials.accessKey) {
    errors.push('HUAWEI_CLOUD_AK is required when IoT integration is enabled.');
  }

  if (!iotEnv.credentials.secretKey) {
    errors.push('HUAWEI_CLOUD_SK is required when IoT integration is enabled.');
  }

  if (iotEnv.runtimeCacheTtlMs <= 0) {
    errors.push('HUAWEI_IOTDA_RUNTIME_CACHE_TTL_MS must be greater than 0.');
  }

  if (iotEnv.commandTimeoutMs <= 0) {
    errors.push('HUAWEI_IOTDA_COMMAND_TIMEOUT_MS must be greater than 0.');
  }

  if (!iotEnv.instanceId) {
    warnings.push(
      'HUAWEI_IOTDA_INSTANCE_ID is empty. Professional edition usually requires the Instance-Id header.'
    );
  }

  if (!iotEnv.resourceSpaceId) {
    warnings.push(
      'HUAWEI_IOTDA_RESOURCE_SPACE_ID is empty. Device sync and filtering will not be limited to a specific resource space.'
    );
  }

  if (!iotEnv.callbackSecret) {
    warnings.push(
      'HUAWEI_IOTDA_CALLBACK_SECRET is empty. The callback endpoint will accept requests without the shared secret check.'
    );
  }

  return {
    enabled: true,
    errors,
    warnings,
  };
}
