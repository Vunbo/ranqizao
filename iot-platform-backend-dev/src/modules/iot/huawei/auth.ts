import { BasicCredentials } from '@huaweicloud/huaweicloud-sdk-core';
import { DerivedAKSKSigner } from '@huaweicloud/huaweicloud-sdk-core/auth/DerivedAKSKSigner';
import type { IHttpRequest } from '@huaweicloud/huaweicloud-sdk-core/http/IHttpRequest';
import { iotEnv } from '../../../config/iot';
import { HttpError } from '../../../shared/http';

interface BuildSignedHeadersInput {
  method: string;
  url: URL;
  headers?: Record<string, string>;
  body?: unknown;
}

function ensureHuaweiCloudCredentials() {
  if (!iotEnv.credentials.accessKey || !iotEnv.credentials.secretKey) {
    throw new HttpError(500, 'Huawei Cloud AK/SK credentials are incomplete.');
  }

  if (!iotEnv.credentials.projectId) {
    throw new HttpError(500, 'Huawei Cloud project ID is missing.');
  }

  if (!iotEnv.region) {
    throw new HttpError(500, 'Huawei Cloud region is missing.');
  }

  if (!iotEnv.signingService) {
    throw new HttpError(500, 'Huawei IoTDA signing service is missing.');
  }
}

function buildQueryParams(url: URL) {
  const queryParams: Record<string, string | string[]> = {};

  for (const [key, value] of url.searchParams.entries()) {
    const existingValue = queryParams[key];
    if (existingValue === undefined) {
      queryParams[key] = value;
      continue;
    }

    if (Array.isArray(existingValue)) {
      existingValue.push(value);
      continue;
    }

    queryParams[key] = [existingValue, value];
  }

  return queryParams;
}

function createHuaweiCloudCredentials() {
  const credentials = new BasicCredentials()
    .withAk(iotEnv.credentials.accessKey)
    .withSk(iotEnv.credentials.secretKey)
    .withProjectId(iotEnv.credentials.projectId)
    .withRegionId(iotEnv.region);

  credentials.processDerivedAuthParams(iotEnv.signingService, iotEnv.region);
  return credentials;
}

export function buildHuaweiCloudSignedHeaders(input: BuildSignedHeadersInput) {
  ensureHuaweiCloudCredentials();

  const normalizedHeaders = Object.fromEntries(
    Object.entries(input.headers || {})
      .filter(([, value]) => Boolean(value?.trim()))
      .map(([name, value]) => [name.toLowerCase(), value.trim()])
  ) as Record<string, string>;

  normalizedHeaders['x-project-id'] = iotEnv.credentials.projectId;

  const request: IHttpRequest = {
    endpoint: input.url.origin,
    method: input.method.trim().toUpperCase(),
    headers: normalizedHeaders,
    queryParams: buildQueryParams(input.url),
    data: input.body ?? undefined,
  };

  const signedHeaders = DerivedAKSKSigner.sign(
    request,
    createHuaweiCloudCredentials()
  ) as Record<string, string>;

  delete signedHeaders.host;
  return signedHeaders;
}
