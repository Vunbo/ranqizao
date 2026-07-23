import { iotEnv, isIotIntegrationEnabled } from '../../../config/iot';
import { HttpError } from '../../../shared/http';
import { buildHuaweiCloudSignedHeaders } from './auth';
import type { HuaweiCloudDevice } from '../types';

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

function ensureClientConfig() {
  if (!isIotIntegrationEnabled()) {
    throw new HttpError(503, 'Huawei IoTDA integration is disabled or misconfigured.');
  }
}

function parseJsonPayload(text: string) {
  if (!text) {
    return {} as Record<string, unknown>;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text } as Record<string, unknown>;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {}
) {
  ensureClientConfig();

  const url = new URL(path, iotEnv.endpoint.endsWith('/') ? iotEnv.endpoint : `${iotEnv.endpoint}/`);

  for (const [key, value] of Object.entries(options.query || {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  const requestBody = options.body === undefined ? undefined : options.body;
  const requestBodyText = requestBody === undefined ? undefined : JSON.stringify(requestBody);
  const headers = buildHuaweiCloudSignedHeaders({
    method,
    url,
    headers: {
      'content-type': 'application/json',
      ...(iotEnv.instanceId ? { 'instance-id': iotEnv.instanceId } : {}),
    },
    body: requestBody,
  });
  const response = await fetch(url, {
    method,
    headers,
    body: requestBodyText,
  });

  const text = await response.text();
  const payload = parseJsonPayload(text);

  if (!response.ok) {
    throw new HttpError(
      response.status,
      String(
        payload.error_msg
          || payload.error_message
          || payload.message
          || payload.raw
          || `Huawei IoTDA request failed: ${method} ${path}`
      )
    );
  }

  return payload as T;
}

function buildProjectPath(pathname: string) {
  return `/v5/iot/${iotEnv.credentials.projectId}${pathname}`;
}

export async function listHuaweiCloudDevices(input: {
  nodeId?: string;
  pageNo?: number;
  pageSize?: number;
}) {
  const response = await request<{ devices?: HuaweiCloudDevice[] }>(
    'GET',
    buildProjectPath('/devices'),
    {
      query: {
        app_id: iotEnv.resourceSpaceId || undefined,
        node_id: input.nodeId,
        page_no: input.pageNo || 0,
        page_size: input.pageSize || 50,
      },
    }
  );

  return response.devices || [];
}

export async function showHuaweiCloudDevice(deviceId: string) {
  return request<Record<string, unknown>>(
    'GET',
    buildProjectPath(`/devices/${encodeURIComponent(deviceId)}`)
  );
}

export async function showHuaweiCloudDeviceShadow(deviceId: string) {
  return request<Record<string, unknown>>(
    'GET',
    buildProjectPath(`/devices/${encodeURIComponent(deviceId)}/shadow`)
  );
}

export async function listHuaweiCloudDeviceProperties(deviceId: string, serviceId: string) {
  return request<Record<string, unknown>>(
    'GET',
    buildProjectPath(`/devices/${encodeURIComponent(deviceId)}/properties`),
    {
      query: {
        service_id: serviceId,
      },
    }
  );
}

export async function createHuaweiCloudCommand(input: {
  deviceId: string;
  serviceId: string;
  commandName: string;
  paras: Record<string, unknown>;
}) {
  return request<Record<string, unknown>>(
    'POST',
    buildProjectPath(`/devices/${encodeURIComponent(input.deviceId)}/commands`),
    {
      body: {
        service_id: input.serviceId,
        command_name: input.commandName,
        paras: input.paras,
        expire_time: Math.max(1, Math.round(iotEnv.commandTimeoutMs / 1000)),
      },
    }
  );
}
