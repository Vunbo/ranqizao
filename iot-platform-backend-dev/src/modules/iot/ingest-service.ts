import { withTransaction } from '../../db/client';
import { iotEnv } from '../../config/iot';
import { HttpError } from '../../shared/http';
import {
  getDeviceIotLinkByCloudIdentity,
  getDeviceIotLinkByInventoryId,
  getDeviceRuntimeStateByDeviceId,
  getInventoryCloudIdentityByNodeIdentifier,
  insertDeviceTelemetryHistory,
  insertIotRawMessage,
  resolvePendingAlertsByType,
  upsertDeviceCloudRegistry,
  upsertDeviceRuntimeState,
  upsertPendingAlert,
} from './repository';
import {
  buildStatusOnlyRuntime,
  asRecord,
  normalizeCloudStatus,
  parseIotTimestamp,
  parseRuntimeFromPropertyReport,
  resolveInventoryNodeIdentifier,
} from './runtime';
import { mapRuntimeRowToParsedRuntime } from './service';
import type { DeviceIotLinkRow, HuaweiIotCallbackEnvelope, ParsedRuntimeState } from './types';

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function buildCallbackEnvelope(payload: Record<string, unknown>) {
  const wrapper = asRecord(payload.notify_data || payload.data || payload);
  const header = asRecord(wrapper.header || payload.header);
  const body = asRecord(wrapper.body || payload.body || wrapper);
  const singleService =
    body.service
    || (body.service_id || body.properties
      ? {
          service_id: body.service_id,
          properties: body.properties,
          event_time: body.event_time,
        }
      : null);
  const servicesPayload =
    body.services
    || wrapper.services
    || (singleService ? [singleService] : []);

  const envelope: HuaweiIotCallbackEnvelope = {
    resource:
      normalizeText(header.resource)
      || normalizeText(payload.resource)
      || normalizeText(body.resource)
      || 'unknown',
    event:
      normalizeText(header.event)
      || normalizeText(payload.event)
      || normalizeText(body.event)
      || 'unknown',
    cloudDeviceId:
      normalizeText(header.device_id)
      || normalizeText(payload.device_id)
      || normalizeText(body.device_id),
    nodeId:
      normalizeText(header.node_id)
      || normalizeText(payload.node_id)
      || normalizeText(body.node_id),
    productId:
      normalizeText(header.product_id)
      || normalizeText(payload.product_id)
      || normalizeText(body.product_id),
    resourceSpaceId:
      normalizeText(header.app_id)
      || normalizeText(payload.app_id)
      || normalizeText(body.app_id),
    status:
      normalizeCloudStatus(body.status)
      || normalizeCloudStatus(body.device_status)
      || normalizeCloudStatus(header.status)
      || normalizeCloudStatus(payload.status),
    eventTime:
      normalizeText(body.event_time)
      || normalizeText(header.event_time)
      || normalizeText(payload.event_time),
    servicesPayload,
    body,
    header,
    rawPayload: payload,
  };

  return envelope;
}

function resolveRequestId(envelope: HuaweiIotCallbackEnvelope) {
  return (
    normalizeText(envelope.header.request_id)
    || normalizeText(envelope.header.message_id)
    || normalizeText(envelope.body.request_id)
    || normalizeText(envelope.rawPayload.request_id)
  );
}

function assertValidCallbackSecret(secret: string | null | undefined) {
  if (!iotEnv.callbackSecret) {
    return;
  }

  if (secret && secret === iotEnv.callbackSecret) {
    return;
  }

  throw new HttpError(401, 'Invalid Huawei IoT callback secret.');
}

async function resolveDeviceLinkForEnvelope(
  envelope: HuaweiIotCallbackEnvelope,
  executor: Parameters<typeof withTransaction>[0] extends (executor: infer T) => Promise<unknown> ? T : never
) {
  let link = await getDeviceIotLinkByCloudIdentity(
    {
      cloudDeviceId: envelope.cloudDeviceId,
      nodeId: envelope.nodeId,
    },
    executor
  );

  if (link) {
    return link;
  }

  const identifier = envelope.nodeId || envelope.cloudDeviceId;
  if (!identifier) {
    return null;
  }

  const inventory = await getInventoryCloudIdentityByNodeIdentifier(identifier, executor);
  if (!inventory) {
    return null;
  }

  const boundLink = await getDeviceIotLinkByInventoryId(inventory.id, executor);
  if (envelope.cloudDeviceId) {
    await upsertDeviceCloudRegistry(executor, {
      inventoryId: inventory.id,
      deviceId: boundLink?.id || null,
      resourceSpaceId: envelope.resourceSpaceId,
      productId: envelope.productId,
      cloudDeviceId: envelope.cloudDeviceId,
      nodeId: envelope.nodeId || resolveInventoryNodeIdentifier(inventory),
      authType: 'aksk',
      provisionMode: 'self_registered',
      provisionStatus: envelope.status || 'active',
      cloudDeviceName: null,
      activatedAt: null,
      lastSeenAt: parseIotTimestamp(envelope.eventTime),
      meta: {
        source: 'callback',
        resource: envelope.resource,
        event: envelope.event,
        header: envelope.header,
      },
    });
  }

  return boundLink;
}

async function syncRuntimeAlerts(
  executor: Parameters<typeof withTransaction>[0] extends (executor: infer T) => Promise<unknown> ? T : never,
  link: DeviceIotLinkRow,
  runtime: ParsedRuntimeState
) {
  const normalizedStatus = (runtime.cloudStatus || '').toUpperCase();
  if (normalizedStatus && normalizedStatus !== 'ONLINE') {
    await upsertPendingAlert(executor, {
      deviceId: link.id,
      deviceSn: link.serialNumber || '',
      ownerUid: link.ownerId,
      type: 'offline',
      level: 'normal',
      title: '设备离线',
      message: `设备当前状态为 ${runtime.cloudStatus}`,
      detail: {
        cloudStatus: runtime.cloudStatus,
        lastSeenAt: runtime.lastSeenAt,
      },
    });
  } else {
    await resolvePendingAlertsByType(executor, {
      deviceId: link.id,
      type: 'offline',
      comment: '设备已恢复在线',
    });
  }

  if (runtime.heatTemp !== null && runtime.heatTemp >= 280) {
    await upsertPendingAlert(executor, {
      deviceId: link.id,
      deviceSn: link.serialNumber || '',
      ownerUid: link.ownerId,
      type: 'dry_burn',
      level: 'high',
      title: '高温保护告警',
      message: `检测到加热温度过高：${runtime.heatTemp}℃`,
      metricKey: 'heat_temp',
      currentValue: runtime.heatTemp,
      thresholdValue: 280,
      detail: {
        runState: runtime.runState,
        errorCode: runtime.errorCode,
      },
    });
  } else if (runtime.heatTemp !== null && runtime.heatTemp < 260) {
    await resolvePendingAlertsByType(executor, {
      deviceId: link.id,
      type: 'dry_burn',
      comment: '温度恢复正常',
    });
  }
}

async function processPropertyReport(
  executor: Parameters<typeof withTransaction>[0] extends (executor: infer T) => Promise<unknown> ? T : never,
  link: DeviceIotLinkRow,
  envelope: HuaweiIotCallbackEnvelope
) {
  if (!link.cloudDeviceId || !envelope.cloudDeviceId) {
    return { linked: true, updatedRuntime: false };
  }

  const existingRuntime = await getDeviceRuntimeStateByDeviceId(link.id, executor);
  const runtime = parseRuntimeFromPropertyReport({
    cloudStatus: envelope.status || existingRuntime?.cloudStatus || null,
    servicesPayload: envelope.servicesPayload,
    serviceId: existingRuntime?.serviceId || iotEnv.serviceId,
    eventTime: envelope.eventTime,
    lastSeenAt: parseIotTimestamp(envelope.eventTime) || new Date().toISOString(),
  });

  await upsertDeviceRuntimeState(executor, {
    deviceId: link.id,
    cloudDeviceId: envelope.cloudDeviceId,
    runtime,
  });
  await insertDeviceTelemetryHistory(executor, {
    deviceId: link.id,
    cloudDeviceId: envelope.cloudDeviceId,
    serviceId: runtime.serviceId,
    properties: runtime.reportedProperties,
    reportedAt: runtime.reportedAt,
  });
  await syncRuntimeAlerts(executor, link, runtime);

  return {
    linked: true,
    updatedRuntime: true,
    runtime,
  };
}

async function processStatusUpdate(
  executor: Parameters<typeof withTransaction>[0] extends (executor: infer T) => Promise<unknown> ? T : never,
  link: DeviceIotLinkRow,
  envelope: HuaweiIotCallbackEnvelope
) {
  if (!link.cloudDeviceId && !envelope.cloudDeviceId) {
    return { linked: true, updatedRuntime: false };
  }

  const existingRuntimeRow = await getDeviceRuntimeStateByDeviceId(link.id, executor);
  const runtime = buildStatusOnlyRuntime({
    cloudStatus: envelope.status,
    serviceId: existingRuntimeRow?.serviceId || iotEnv.serviceId,
    existingRuntime: mapRuntimeRowToParsedRuntime(existingRuntimeRow),
    eventTime: envelope.eventTime,
  });

  await upsertDeviceRuntimeState(executor, {
    deviceId: link.id,
    cloudDeviceId: envelope.cloudDeviceId || link.cloudDeviceId || '',
    runtime,
  });
  await syncRuntimeAlerts(executor, link, runtime);

  return {
    linked: true,
    updatedRuntime: true,
    runtime,
  };
}

export async function ingestHuaweiIotCallback(input: {
  payload: Record<string, unknown>;
  secret?: string | null;
}) {
  assertValidCallbackSecret(input.secret);

  const envelope = buildCallbackEnvelope(input.payload);
  const resourceKey = `${envelope.resource}:${envelope.event}`.toLowerCase();

  return withTransaction(async (executor) => {
    const link = await resolveDeviceLinkForEnvelope(envelope, executor);

    const rawMessageId = await insertIotRawMessage(executor, {
      provider: 'huawei_iotda',
      deviceId: link?.id || null,
      cloudDeviceId: envelope.cloudDeviceId,
      nodeId: envelope.nodeId,
      resource: envelope.resource,
      event: envelope.event,
      requestId: resolveRequestId(envelope),
      payload: envelope.rawPayload,
    });

    if (!link) {
      return {
        ok: true,
        rawMessageId,
        linked: false,
        processed: false,
        resource: envelope.resource,
        event: envelope.event,
      };
    }

    if (resourceKey.includes('property') && resourceKey.includes('report')) {
      const result = await processPropertyReport(executor, link, envelope);
      return {
        ok: true,
        rawMessageId,
        resource: envelope.resource,
        event: envelope.event,
        ...result,
      };
    }

    if (resourceKey.includes('status')) {
      const result = await processStatusUpdate(executor, link, envelope);
      return {
        ok: true,
        rawMessageId,
        resource: envelope.resource,
        event: envelope.event,
        ...result,
      };
    }

    return {
      ok: true,
      rawMessageId,
      linked: true,
      processed: false,
      resource: envelope.resource,
      event: envelope.event,
    };
  });
}

