import {
  query,
  withTransaction,
} from '../../database/client';
import { HttpError } from '../../shared/http';
import {
  deriveLocationRegionPath,
  normalizeLocationForStorage,
} from '../../shared/location';
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

  return withTransaction(async (executor) => {
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
}

export async function updateDevice(input: {
  userId: string;
  deviceId: string;
  body: Record<string, unknown>;
}) {
  const { userId, deviceId } = input;
  const { device, isOwner } = await getAccessibleDevice(deviceId, userId);

  if (!device) {
    throw new HttpError(404, '设备不存在或无权限。');
  }

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
  const body = input.body || {};

  for (const key of Object.keys(fieldMap) as Array<keyof typeof fieldMap>) {
    if (!(key in body)) {
      continue;
    }

    if (ownerOnlyFields.has(key) && !isOwner) {
      continue;
    }

    if (key === 'name') {
      const name = String(body[key] || '').trim();
      if (!name) {
        throw new HttpError(400, '设备名称不能为空。');
      }

      const hasDuplicate = await findDuplicateDeviceName(
        device.ownerId,
        name,
        poolExecutor,
        deviceId
      );

      if (hasDuplicate) {
        throw new HttpError(409, '当前账号下已存在同名设备。');
      }

      fields.push({ column: fieldMap[key], value: name });
      continue;
    }

    if (key === 'location') {
      const normalizedLocation = normalizeLocationForStorage(body[key]);
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
      value: body[key],
    });
  }

  if (!fields.length) {
    throw new HttpError(400, '没有可更新的字段。');
  }

  const assignments = fields.map(
    (field, index) => `${field.column} = $${index + 1}${field.cast || ''}`
  );
  const values = fields.map((field) => field.value);
  values.push(deviceId);

  await query(
    `
      UPDATE devices
      SET ${assignments.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
    `,
    values
  );

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
  const { device } = await getAccessibleDevice(input.deviceId, input.userId);

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
  const { device } = await getAccessibleDevice(input.deviceId, input.userId);

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
    ownerId: device.ownerId,
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
  const { device, isOwner } = await getAccessibleDevice(deviceId, userId);

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
  const { device, isOwner } = await getAccessibleDevice(
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
