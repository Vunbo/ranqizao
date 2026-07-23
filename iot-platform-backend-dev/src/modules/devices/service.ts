import {
  query,
  withTransaction,
} from '../../db/client';
import { isIotIntegrationEnabled } from '../../config/iot';
import { HttpError } from '../../shared/http';
import {
  deriveLocationRegionPath,
  normalizeLocationForStorage,
} from '../../shared/location';
import {
  getDeviceLiveProperties,
  getDeviceRuntime,
  getDeviceShadow,
  handleLegacyUserControl,
  refreshDeviceRuntime,
  sendDeviceCommand,
  syncCloudDeviceForBusinessDevice,
} from '../iot/service';
import {
  createBindingEvent,
  createDeviceRecord,
  createOperationLog,
  insertDeviceLog,
} from './device-mutations';
import {
  ensureTargetUserExists,
  findDuplicateDeviceName,
  getAccessibleDevice,
  getBoundDeviceByInventory,
  getDeviceById,
  getInventoryByQrCode,
  getOwnedDeviceForDelete,
  listDeviceLogsByDeviceId,
  listVisibleDevices,
  poolExecutor,
  setInventoryStatus,
} from './device-repository';

function hasOwn(input: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

async function ensureAccessibleDeviceForUser(deviceId: string, userId: string) {
  const { device, isOwner } = await getAccessibleDevice(deviceId, userId);

  if (!device) {
    throw new HttpError(404, '设备不存在或无权限。');
  }

  return { device, isOwner };
}

async function applyLocalDeviceUpdates(input: {
  deviceId: string;
  ownerId: string;
  currentOwnerId: string;
  isOwner: boolean;
  body: Record<string, unknown>;
}) {
  const fieldMap = {
    name: 'name',
    location: 'location',
    isOn: 'is_on',
    fireLevel: 'fire_level',
    temp: 'temp',
    gas: 'gas',
    smoke: 'smoke',
    flow: 'flow',
    humanDetected: 'human_detected',
    vibration: 'vibration',
  } as const;
  const ownerOnlyFields = new Set<keyof typeof fieldMap>([
    'name',
    'location',
  ]);
  const fields: Array<{ column: string; value: unknown; cast?: string }> = [];

  for (const key of Object.keys(fieldMap) as Array<keyof typeof fieldMap>) {
    if (!(key in input.body)) {
      continue;
    }

    if (ownerOnlyFields.has(key) && !input.isOwner) {
      continue;
    }

    if (key === 'name') {
      const name = String(input.body[key] || '').trim();
      if (!name) {
        throw new HttpError(400, '设备名称不能为空。');
      }

      const hasDuplicate = await findDuplicateDeviceName(
        input.currentOwnerId,
        name,
        poolExecutor,
        input.deviceId
      );

      if (hasDuplicate) {
        throw new HttpError(409, '当前账号下已存在同名设备。');
      }

      fields.push({ column: fieldMap[key], value: name });
      continue;
    }

    if (key === 'location') {
      const normalizedLocation = normalizeLocationForStorage(input.body[key]);
      fields.push({
        column: fieldMap[key],
        value: JSON.stringify(normalizedLocation),
        cast: '::jsonb',
      });
      fields.push({
        column: 'region_path',
        value: normalizedLocation
          ? deriveLocationRegionPath(normalizedLocation, { includeDistrict: true })
          : null,
      });
      continue;
    }

    fields.push({
      column: fieldMap[key],
      value: input.body[key],
    });
  }

  if (!fields.length) {
    return false;
  }

  const assignments = fields.map(
    (field, index) => `${field.column} = $${index + 1}${field.cast || ''}`
  );
  const values = fields.map((field) => field.value);
  values.push(input.deviceId);

  await query(
    `
      UPDATE devices
      SET ${assignments.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
    `,
    values
  );

  return true;
}

export async function listDevices(uid: string) {
  return listVisibleDevices(uid);
}

export async function createDevice(input: {
  ownerId: string;
  name: string;
  location?: unknown;
  inventoryId?: string | null;
  serialNumber?: string | null;
}) {
  return createDeviceRecord(poolExecutor, input);
}

export async function scanBindableDevice(input: {
  userId: string;
  qrCode: string;
}) {
  const qrCode = String(input.qrCode || '').trim();

  if (!qrCode) {
    throw new HttpError(400, '扫码内容不能为空。');
  }

  const inventory = await getInventoryByQrCode(qrCode);

  if (!inventory) {
    throw new HttpError(404, '未识别到可绑定设备。');
  }

  if (inventory.status === 'disabled') {
    throw new HttpError(403, '该设备已被禁用，无法绑定。');
  }

  const boundDevice = await getBoundDeviceByInventory(inventory.id);

  if (boundDevice && inventory.status !== 'bound') {
    await setInventoryStatus(inventory.id, 'bound');
    inventory.status = 'bound';
  }

  if (boundDevice) {
    return {
      bindStatus:
        boundDevice.ownerId === input.userId
          ? 'already_bound_to_current_user'
          : 'already_bound',
      inventory,
      device: boundDevice,
    };
  }

  if (inventory.status === 'bound') {
    throw new HttpError(409, '设备库存状态异常，请联系管理员处理。');
  }

  return {
    bindStatus: 'available',
    inventory,
  };
}

export async function bindScannedDevice(input: {
  userId: string;
  qrCode: string;
  name: string;
  location?: unknown;
  wifiSsid?: string;
}) {
  const qrCode = String(input.qrCode || '').trim();

  const result = await withTransaction(async (executor) => {
    const inventory = await getInventoryByQrCode(qrCode, executor, true);

    if (!inventory) {
      throw new HttpError(404, '未识别到可绑定设备。');
    }

    if (inventory.status === 'disabled') {
      throw new HttpError(403, '该设备已被禁用，无法绑定。');
    }

    const existingDevice = await getBoundDeviceByInventory(inventory.id, executor);
    if (existingDevice) {
      throw new HttpError(409, '该设备已完成绑定。');
    }

    if (inventory.status !== 'available') {
      throw new HttpError(409, '当前设备状态不允许绑定。');
    }

    const device = await createDeviceRecord(executor, {
      ownerId: input.userId,
      name: input.name,
      location: input.location,
      inventoryId: inventory.id,
      serialNumber: inventory.serialNumber,
    });

    await setInventoryStatus(inventory.id, 'bound', executor);

    await createOperationLog(executor, {
      deviceId: device.id,
      ownerId: input.userId,
      event: '设备完成扫码绑定',
      type: 'success',
    });

    await createBindingEvent(executor, {
      inventoryId: inventory.id,
      deviceId: device.id,
      ownerId: input.userId,
      eventType: 'bind_success',
      detail: {
        qrCode: inventory.qrCode,
        serialNumber: inventory.serialNumber,
        wifiSsid: input.wifiSsid ? String(input.wifiSsid) : null,
        location: normalizeLocationForStorage(input.location),
      },
    });

    return {
      device,
      inventory: {
        ...inventory,
        status: 'bound' as const,
      },
      wifiSsid: input.wifiSsid ? String(input.wifiSsid) : null,
    };
  });

  let cloudBinding: {
    status: 'linked' | 'failed' | 'disabled';
    message?: string;
  } = {
    status: 'disabled',
  };

  if (isIotIntegrationEnabled() && result.device.inventoryId) {
    try {
      await syncCloudDeviceForBusinessDevice({
        deviceId: result.device.id,
        inventoryId: result.device.inventoryId,
      });
      await refreshDeviceRuntime(result.device.id).catch(() => null);
      cloudBinding = {
        status: 'linked',
      };
    } catch (error) {
      cloudBinding = {
        status: 'failed',
        message: error instanceof Error ? error.message : '云设备映射失败。',
      };
    }
  }

  return {
    ...result,
    cloudBinding,
  };
}

export async function updateDevice(input: {
  userId: string;
  deviceId: string;
  body: Record<string, unknown>;
}) {
  const { userId, deviceId } = input;
  const { device, isOwner } = await ensureAccessibleDeviceForUser(deviceId, userId);
  const body = input.body || {};

  const hasControlFields = hasOwn(body, 'isOn') || hasOwn(body, 'fireLevel');
  const hasBusinessFields = hasOwn(body, 'name') || hasOwn(body, 'location');
  const hasTelemetryFields = [
    'temp',
    'gas',
    'smoke',
    'flow',
    'humanDetected',
    'vibration',
  ].some((key) => hasOwn(body, key));

  if (!hasControlFields && !hasBusinessFields && !hasTelemetryFields) {
    throw new HttpError(400, '没有可更新的字段。');
  }

  let changed = false;

  if (hasBusinessFields || (hasTelemetryFields && !isIotIntegrationEnabled())) {
    changed = await applyLocalDeviceUpdates({
      deviceId,
      ownerId: userId,
      currentOwnerId: device.ownerId,
      isOwner,
      body,
    });
  }

  if (hasControlFields) {
    if (isIotIntegrationEnabled()) {
      await handleLegacyUserControl({
        deviceId,
        userUid: userId,
        userName: userId,
        isOn: hasOwn(body, 'isOn') ? body.isOn : undefined,
        fireLevel: hasOwn(body, 'fireLevel') ? body.fireLevel : undefined,
      });

      await refreshDeviceRuntime(deviceId).catch(() => null);
      changed = true;
    } else {
      changed =
        (await applyLocalDeviceUpdates({
          deviceId,
          ownerId: userId,
          currentOwnerId: device.ownerId,
          isOwner,
          body,
        })) || changed;
    }
  }

  if (!changed) {
    throw new HttpError(400, '没有可更新的字段。');
  }

  const refreshedDevice = await getDeviceById(deviceId);

  if (!refreshedDevice) {
    throw new HttpError(404, '设备不存在或无权限。');
  }

  return refreshedDevice;
}

export async function deleteDevice(input: { userId: string; deviceId: string }) {
  return withTransaction(async (executor) => {
    const device = await getOwnedDeviceForDelete(
      input.deviceId,
      input.userId,
      executor
    );

    if (!device) {
      throw new HttpError(404, '设备不存在或无权限删除。');
    }

    if (device.inventoryId) {
      await setInventoryStatus(device.inventoryId, 'available', executor);

      await createBindingEvent(executor, {
        inventoryId: device.inventoryId,
        deviceId: device.id,
        ownerId: input.userId,
        eventType: 'unbind_success',
        detail: {
          deviceName: device.name,
          serialNumber: device.serialNumber,
          reason: 'owner_delete',
        },
      });
    }

    await executor.query('DELETE FROM devices WHERE id = $1', [input.deviceId]);
    return { ok: true };
  });
}

export async function listDeviceLogs(input: { userId: string; deviceId: string }) {
  const { device } = await ensureAccessibleDeviceForUser(input.deviceId, input.userId);

  if (!device) {
    throw new HttpError(404, '设备不存在或无权限查看。');
  }

  return listDeviceLogsByDeviceId(input.deviceId);
}

export async function createDeviceLog(input: {
  userId: string;
  deviceId: string;
  event: string;
  type?: string;
}) {
  const { device } = await ensureAccessibleDeviceForUser(input.deviceId, input.userId);

  if (!device) {
    throw new HttpError(404, '设备不存在或无权限操作。');
  }

  const event = String(input.event || '').trim();
  const type = String(input.type || 'info').trim();

  if (!event) {
    throw new HttpError(400, '日志内容不能为空。');
  }

  if (!['info', 'warning', 'success'].includes(type)) {
    throw new HttpError(400, '日志类型无效。');
  }

  return insertDeviceLog(poolExecutor, {
    deviceId: input.deviceId,
    ownerId: input.userId,
    event,
    type: type as 'info' | 'warning' | 'success',
  });
}

export async function shareDevice(input: {
  userId: string;
  deviceId: string;
  targetUserId: string;
}) {
  const { userId, deviceId } = input;
  const targetUserId = String(input.targetUserId || '').trim();
  const { device, isOwner } = await ensureAccessibleDeviceForUser(deviceId, userId);

  if (!device || !isOwner) {
    throw new HttpError(404, '设备不存在或无权限共享。');
  }

  if (!targetUserId || targetUserId.length !== 8) {
    throw new HttpError(400, '请输入 8 位用户 UID。');
  }

  if (targetUserId === userId) {
    throw new HttpError(400, '不能共享给自己。');
  }

  await ensureTargetUserExists(targetUserId);

  await query(
    `
      INSERT INTO device_shares (device_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (device_id, user_id) DO NOTHING
    `,
    [deviceId, targetUserId]
  );

  return { ok: true };
}

export async function removeDeviceShare(input: {
  userId: string;
  deviceId: string;
  targetUserId: string;
}) {
  const { device, isOwner } = await ensureAccessibleDeviceForUser(
    input.deviceId,
    input.userId
  );

  if (!device || !isOwner) {
    throw new HttpError(404, '设备不存在或无权限取消共享。');
  }

  await query(
    'DELETE FROM device_shares WHERE device_id = $1 AND user_id = $2',
    [input.deviceId, input.targetUserId]
  );

  return { ok: true };
}

export async function getUserDeviceRuntime(input: {
  userId: string;
  deviceId: string;
}) {
  await ensureAccessibleDeviceForUser(input.deviceId, input.userId);
  return getDeviceRuntime(input.deviceId);
}

export async function refreshUserDeviceRuntime(input: {
  userId: string;
  deviceId: string;
}) {
  await ensureAccessibleDeviceForUser(input.deviceId, input.userId);
  return refreshDeviceRuntime(input.deviceId);
}

export async function getUserDeviceShadow(input: {
  userId: string;
  deviceId: string;
}) {
  await ensureAccessibleDeviceForUser(input.deviceId, input.userId);
  return getDeviceShadow(input.deviceId);
}

export async function getUserDeviceLiveProperties(input: {
  userId: string;
  deviceId: string;
}) {
  await ensureAccessibleDeviceForUser(input.deviceId, input.userId);
  return getDeviceLiveProperties(input.deviceId);
}

export async function executeUserDeviceCommand(input: {
  userId: string;
  deviceId: string;
  commandName: string;
  paras?: Record<string, unknown>;
}) {
  await ensureAccessibleDeviceForUser(input.deviceId, input.userId);

  const commandName = String(input.commandName || '').trim();
  if (!commandName) {
    throw new HttpError(400, '命令名称不能为空。');
  }

  const result = await sendDeviceCommand({
    deviceId: input.deviceId,
    operator: {
      type: 'user',
      userUid: input.userId,
      name: input.userId,
    },
    commandName,
    paras: input.paras || {},
  });

  await refreshDeviceRuntime(input.deviceId).catch(() => null);

  return result;
}
