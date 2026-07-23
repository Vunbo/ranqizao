import { randomUUID } from 'crypto';
import { withTransaction } from '../../db/client';
import { iotEnv, isIotIntegrationEnabled } from '../../config/iot';
import { HttpError } from '../../shared/http';
import {
  createHuaweiCloudCommand,
  listHuaweiCloudDeviceProperties,
  listHuaweiCloudDevices,
  showHuaweiCloudDevice,
  showHuaweiCloudDeviceShadow,
} from './huawei/client';
import {
  createDeviceCommandAudit,
  finishDeviceCommandAudit,
  getDeviceIotLinkByDeviceId,
  getDeviceRuntimeStateByDeviceId,
  getInventoryCloudIdentityById,
  upsertDeviceCloudRegistry,
  upsertDeviceRuntimeState,
} from './repository';
import {
  asRecord,
  deriveLegacyFireLevelFromGear,
  deriveLegacyGearFromFireLevel,
  normalizeCloudStatus,
  parseRuntimeFromShadow,
  resolveInventoryNodeIdentifier,
  toNullableNumber,
} from './runtime';
import type {
  DeviceRuntimeStateRow,
  HuaweiCloudDevice,
  InventoryCloudIdentity,
  ParsedRuntimeState,
} from './types';

interface CommandOperator {
  type: 'admin' | 'system' | 'user';
  adminId?: string | null;
  userUid?: string | null;
  name: string;
}

function ensureIotEnabled() {
  if (!isIotIntegrationEnabled()) {
    throw new HttpError(503, 'Huawei IoT integration is disabled or misconfigured.');
  }
}

function pickCloudDevice(
  devices: HuaweiCloudDevice[],
  inventory: InventoryCloudIdentity
) {
  const identifier = resolveInventoryNodeIdentifier(inventory);

  if (!identifier) {
    return null;
  }

  return (
    devices.find((item) => item.node_id === identifier)
    || devices.find((item) => item.device_id === identifier)
    || devices[0]
    || null
  );
}

function extractCloudStatus(payload: Record<string, unknown>) {
  const candidates = [
    payload.status,
    payload.device_status,
    payload.connection_status,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeCloudStatus(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function extractCommandResult(payload: Record<string, unknown>) {
  const responsePayload = asRecord(payload.response || payload.command_response || payload);
  const resultCode = toNullableNumber(
    responsePayload.result_code
    ?? responsePayload.code
    ?? payload.result_code
    ?? payload.code
  );
  const resultMessage =
    (typeof responsePayload.result_msg === 'string' && responsePayload.result_msg)
    || (typeof responsePayload.message === 'string' && responsePayload.message)
    || (typeof payload.message === 'string' && payload.message)
    || null;
  const cloudRequestId =
    (typeof payload.command_id === 'string' && payload.command_id)
    || (typeof payload.commandId === 'string' && payload.commandId)
    || null;

  return {
    cloudRequestId,
    resultCode,
    resultMessage,
    responsePayload,
  };
}

export function mapRuntimeRowToParsedRuntime(row: DeviceRuntimeStateRow | null) {
  if (!row) {
    return null;
  }

  const runtime: ParsedRuntimeState = {
    cloudStatus: row.cloudStatus,
    serviceId: row.serviceId,
    reportedProperties: row.reportedProperties || {},
    desiredProperties: row.desiredProperties || {},
    summary: row.summary || {},
    runState: row.runState,
    heatTemp: row.heatTemp,
    roomTemp: row.roomTemp,
    fuelConsumption: row.fuelConsumption,
    errorCode: row.errorCode,
    position: row.position,
    reportedAt: row.reportedAt,
    lastSeenAt: row.lastSeenAt,
    compatibility: {
      isOn: typeof row.summary?.isOn === 'boolean' ? (row.summary.isOn as boolean) : null,
      fireLevel: deriveLegacyFireLevelFromGear(
        row.reportedProperties?.current_gear
          || row.desiredProperties?.config_gear
          || row.reportedProperties?.CONFIG_GO
          || row.desiredProperties?.CONFIG_GO
      ),
      temp: row.heatTemp,
      flow: row.fuelConsumption,
    },
  };

  return runtime;
}

export async function syncCloudDeviceForBusinessDevice(input: {
  deviceId: string;
  inventoryId: string;
}) {
  ensureIotEnabled();

  const inventory = await getInventoryCloudIdentityById(input.inventoryId);
  if (!inventory) {
    throw new HttpError(404, 'Inventory device not found.');
  }

  const identifier = resolveInventoryNodeIdentifier(inventory);
  if (!identifier) {
    throw new HttpError(409, 'Inventory device is missing node_id or IMEI.');
  }

  const cloudDevices = await listHuaweiCloudDevices({
    nodeId: identifier,
    pageSize: 20,
  });
  const matchedDevice = pickCloudDevice(cloudDevices, inventory);

  if (!matchedDevice?.device_id) {
    throw new HttpError(404, 'Cloud device was not found in Huawei IoTDA.');
  }

  await withTransaction(async (executor) => {
    await upsertDeviceCloudRegistry(executor, {
      inventoryId: inventory.id,
      deviceId: input.deviceId,
      resourceSpaceId: matchedDevice.app_id || iotEnv.resourceSpaceId || null,
      productId: matchedDevice.product_id || null,
      cloudDeviceId: matchedDevice.device_id,
      nodeId: matchedDevice.node_id || identifier,
      authType: 'aksk',
      provisionMode: 'self_registered',
      provisionStatus:
        matchedDevice.status || matchedDevice.device_status || 'active',
      cloudDeviceName: matchedDevice.name || null,
      activatedAt: matchedDevice.activated_time || null,
      lastSeenAt: matchedDevice.last_time || null,
      meta: matchedDevice as unknown as Record<string, unknown>,
    });
  });

  return matchedDevice;
}

async function ensureDeviceCloudLink(deviceId: string) {
  const existing = await getDeviceIotLinkByDeviceId(deviceId);
  if (!existing) {
    throw new HttpError(404, 'Device not found.');
  }

  if (existing.cloudDeviceId) {
    return existing;
  }

  if (!existing.inventoryId) {
    throw new HttpError(409, 'Device is not linked to inventory.');
  }

  await syncCloudDeviceForBusinessDevice({
    deviceId,
    inventoryId: existing.inventoryId,
  });

  const refreshed = await getDeviceIotLinkByDeviceId(deviceId);
  if (!refreshed?.cloudDeviceId) {
    throw new HttpError(409, 'Failed to build cloud device mapping.');
  }

  return refreshed;
}

export async function refreshDeviceRuntime(deviceId: string) {
  ensureIotEnabled();

  const link = await ensureDeviceCloudLink(deviceId);
  const cloudDeviceId = link.cloudDeviceId;
  if (!cloudDeviceId) {
    throw new HttpError(409, 'Device is not linked to Huawei IoT.');
  }

  const [shadowPayload, devicePayload] = await Promise.all([
    showHuaweiCloudDeviceShadow(cloudDeviceId),
    showHuaweiCloudDevice(cloudDeviceId),
  ]);
  const cloudStatus = extractCloudStatus(devicePayload);
  const runtime = parseRuntimeFromShadow({
    cloudStatus,
    shadowPayload,
    devicePayload,
    serviceId: iotEnv.serviceId,
  });

  await withTransaction(async (executor) => {
    await upsertDeviceRuntimeState(executor, {
      deviceId,
      cloudDeviceId,
      runtime,
    });
  });

  const runtimeState = await getDeviceRuntimeStateByDeviceId(deviceId);
  return {
    runtime: runtimeState,
    shadow: shadowPayload,
    device: devicePayload,
  };
}

export async function getDeviceRuntime(deviceId: string) {
  const cached = await getDeviceRuntimeStateByDeviceId(deviceId);
  if (!isIotIntegrationEnabled()) {
    return cached;
  }

  if (!cached) {
    const refreshed = await refreshDeviceRuntime(deviceId);
    return refreshed.runtime;
  }

  const age = Date.now() - new Date(cached.updatedAt).getTime();
  if (!Number.isFinite(age) || age > iotEnv.runtimeCacheTtlMs) {
    const refreshed = await refreshDeviceRuntime(deviceId);
    return refreshed.runtime;
  }

  return cached;
}

export async function getDeviceShadow(deviceId: string) {
  ensureIotEnabled();
  const link = await ensureDeviceCloudLink(deviceId);
  if (!link.cloudDeviceId) {
    throw new HttpError(409, 'Device is not linked to Huawei IoT.');
  }

  return showHuaweiCloudDeviceShadow(link.cloudDeviceId);
}

export async function getDeviceLiveProperties(deviceId: string) {
  ensureIotEnabled();
  const link = await ensureDeviceCloudLink(deviceId);
  if (!link.cloudDeviceId) {
    throw new HttpError(409, 'Device is not linked to Huawei IoT.');
  }

  return listHuaweiCloudDeviceProperties(link.cloudDeviceId, iotEnv.serviceId);
}

export async function sendDeviceCommand(input: {
  deviceId: string;
  operator: CommandOperator;
  commandName: string;
  paras: Record<string, unknown>;
}) {
  ensureIotEnabled();

  const link = await ensureDeviceCloudLink(input.deviceId);
  if (!link.cloudDeviceId) {
    throw new HttpError(409, 'Device is not linked to Huawei IoT.');
  }

  const auditId = randomUUID();
  await withTransaction(async (executor) => {
    await createDeviceCommandAudit(executor, {
      id: auditId,
      deviceId: input.deviceId,
      deviceSn: link.serialNumber || '',
      operatorType: input.operator.type,
      operatorAdminId: input.operator.adminId || null,
      operatorUserUid: input.operator.userUid || null,
      operatorName: input.operator.name,
      commandType: input.commandName,
      requestPayload: {
        serviceId: iotEnv.serviceId,
        paras: input.paras,
      },
      cloudDeviceId: link.cloudDeviceId,
    });
  });

  try {
    const payload = await createHuaweiCloudCommand({
      deviceId: link.cloudDeviceId,
      serviceId: iotEnv.serviceId,
      commandName: input.commandName,
      paras: input.paras,
    });
    const commandResult = extractCommandResult(payload);
    const isSuccess =
      commandResult.resultCode === null || commandResult.resultCode === 100;

    await withTransaction(async (executor) => {
      await finishDeviceCommandAudit(executor, {
        id: auditId,
        status: isSuccess ? 'success' : 'failed',
        responsePayload: payload,
        failureReason: isSuccess ? null : commandResult.resultMessage || 'Device command failed.',
        cloudRequestId: commandResult.cloudRequestId,
        resultCode: commandResult.resultCode,
        resultMessage: commandResult.resultMessage,
      });

      if (input.commandName === 'power_switch') {
        await executor.query(
          `
            UPDATE devices
            SET
              is_on = $2,
              fire_level = CASE WHEN $2 THEN COALESCE(NULLIF(fire_level, 0), 60) ELSE 0 END,
              updated_at = NOW()
            WHERE id = $1
          `,
          [input.deviceId, Number(input.paras.value) === 1]
        );
      }

      if (input.commandName === 'config_gear') {
        await executor.query(
          `
            UPDATE devices
            SET fire_level = $2, updated_at = NOW()
            WHERE id = $1
          `,
          [input.deviceId, deriveLegacyFireLevelFromGear(input.paras.gear)]
        );
      }
    });

    if (!isSuccess) {
      throw new HttpError(409, commandResult.resultMessage || 'Device command failed.');
    }

    return {
      auditId,
      payload,
    };
  } catch (error) {
    await withTransaction(async (executor) => {
      await finishDeviceCommandAudit(executor, {
        id: auditId,
        status: error instanceof HttpError && error.statusCode === 408 ? 'timeout' : 'failed',
        responsePayload: null,
        failureReason: error instanceof Error ? error.message : 'Device command failed.',
      });
    });

    throw error;
  }
}

export async function handleLegacyUserControl(input: {
  deviceId: string;
  userUid: string;
  userName: string;
  isOn?: unknown;
  fireLevel?: unknown;
}) {
  if (!isIotIntegrationEnabled()) {
    return false;
  }

  if (input.isOn !== undefined) {
    await sendDeviceCommand({
      deviceId: input.deviceId,
      operator: {
        type: 'user',
        userUid: input.userUid,
        name: input.userName,
      },
      commandName: 'power_switch',
      paras: {
        value: input.isOn ? 1 : 0,
      },
    });
  }

  if (input.fireLevel !== undefined) {
    const gear = deriveLegacyGearFromFireLevel(input.fireLevel);
    if (!gear) {
      throw new HttpError(400, 'Invalid fire level.');
    }

    await sendDeviceCommand({
      deviceId: input.deviceId,
      operator: {
        type: 'user',
        userUid: input.userUid,
        name: input.userName,
      },
      commandName: 'config_gear',
      paras: {
        gear,
      },
    });
  }

  return input.isOn !== undefined || input.fireLevel !== undefined;
}

export async function handleLegacyAdminControl(input: {
  deviceId: string;
  adminId: string;
  adminName: string;
  command: string;
}) {
  if (!isIotIntegrationEnabled()) {
    return false;
  }

  const command = String(input.command || '').trim();
  if (!command) {
    throw new HttpError(400, 'Command is required.');
  }

  if (command === 'ignite') {
    await sendDeviceCommand({
      deviceId: input.deviceId,
      operator: {
        type: 'admin',
        adminId: input.adminId,
        name: input.adminName,
      },
      commandName: 'power_switch',
      paras: { value: 1 },
    });
    return true;
  }

  if (command === 'shutdown') {
    await sendDeviceCommand({
      deviceId: input.deviceId,
      operator: {
        type: 'admin',
        adminId: input.adminId,
        name: input.adminName,
      },
      commandName: 'power_switch',
      paras: { value: 0 },
    });
    return true;
  }

  return false;
}

