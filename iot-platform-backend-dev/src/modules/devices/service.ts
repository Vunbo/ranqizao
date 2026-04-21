import { randomUUID } from 'crypto';
import {
  query,
  withTransaction,
  type DatabaseExecutor,
} from '../../database/client';
import { HttpError } from '../../shared/http';

interface DeviceAccessRow {
  id: string;
  name: string;
  ownerId: string;
  inventoryId: string | null;
  serialNumber: string | null;
  sharedWith: string[];
}

interface DeviceInventoryRow {
  id: string;
  qrCode: string;
  serialNumber: string;
  productModel: string;
  firmwareVersion: string;
  status: 'available' | 'bound' | 'disabled';
}

const poolExecutor: DatabaseExecutor = {
  query,
};

const DEVICE_SELECT_SQL = `
  SELECT
    d.id,
    d.name,
    d.owner_id AS "ownerId",
    owner_user.display_name AS "ownerDisplayName",
    d.inventory_id AS "inventoryId",
    d.serial_number AS "serialNumber",
    (
      SELECT hdl.home_id
      FROM home_device_links hdl
      WHERE hdl.device_id = d.id
      ORDER BY hdl.created_at
      LIMIT 1
    ) AS "homeId",
    COALESCE(
      ARRAY(
        SELECT hdl.home_id
        FROM home_device_links hdl
        WHERE hdl.device_id = d.id
        ORDER BY hdl.created_at
      ),
      ARRAY[]::TEXT[]
    ) AS "homeIds",
    d.location,
    d.is_on AS "isOn",
    d.fire_level AS "fireLevel",
    d.temp,
    d.gas,
    d.smoke,
    d.flow,
    d.human_detected AS "humanDetected",
    d.vibration,
    d.created_at AS "createdAt",
    d.updated_at AS "updatedAt",
    COALESCE(
      ARRAY(
        SELECT ds.user_id
        FROM device_shares ds
        WHERE ds.device_id = d.id
        ORDER BY ds.user_id
      ),
      ARRAY[]::TEXT[]
    ) AS "sharedWith",
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'uid', share_user.short_uid,
            'displayName', share_user.display_name
          )
          ORDER BY ds.created_at
        )
        FROM device_shares ds
        INNER JOIN users share_user
          ON share_user.short_uid = ds.user_id
        WHERE ds.device_id = d.id
      ),
      '[]'::jsonb
    ) AS "sharedWithProfiles"
  FROM devices d
  INNER JOIN users owner_user
    ON owner_user.short_uid = d.owner_id
`;

async function getDeviceById(
  deviceId: string,
  executor: DatabaseExecutor = poolExecutor
) {
  const result = await executor.query(
    `
      ${DEVICE_SELECT_SQL}
      WHERE d.id = $1
      LIMIT 1
    `,
    [deviceId]
  );

  return result.rows[0] || null;
}

async function getAccessibleDevice(
  deviceId: string,
  userId: string
): Promise<{ device: DeviceAccessRow | null; isOwner: boolean }> {
  const result = await query<DeviceAccessRow>(
    `
      SELECT
        d.id,
        d.name,
        d.owner_id AS "ownerId",
        d.inventory_id AS "inventoryId",
        d.serial_number AS "serialNumber",
        COALESCE(
          ARRAY(
            SELECT ds.user_id
            FROM device_shares ds
            WHERE ds.device_id = d.id
            ORDER BY ds.user_id
          ),
          ARRAY[]::TEXT[]
        ) AS "sharedWith"
      FROM devices d
      WHERE d.id = $1
        AND (
          d.owner_id = $2
          OR EXISTS (
            SELECT 1
            FROM device_shares ds
            WHERE ds.device_id = d.id AND ds.user_id = $2
          )
          OR EXISTS (
            SELECT 1
            FROM home_device_links hdl
            INNER JOIN home_members hm
              ON hm.home_id = hdl.home_id
            WHERE hdl.device_id = d.id
              AND hm.user_id = $2
          )
        )
      LIMIT 1
    `,
    [deviceId, userId]
  );

  const device = result.rows[0] || null;
  return { device, isOwner: device?.ownerId === userId };
}

async function ensureTargetUserExists(userId: string) {
  const found = await query<{ short_uid: string }>(
    'SELECT short_uid FROM users WHERE short_uid = $1 LIMIT 1',
    [userId]
  );

  if (!found.rowCount) {
    throw new HttpError(404, '目标用户不存在。');
  }
}

async function getInventoryByQrCode(
  qrCode: string,
  executor: DatabaseExecutor = poolExecutor,
  forUpdate = false
) {
  const result = await executor.query<DeviceInventoryRow>(
    `
      SELECT
        id,
        qr_code AS "qrCode",
        serial_number AS "serialNumber",
        product_model AS "productModel",
        firmware_version AS "firmwareVersion",
        status
      FROM device_inventory
      WHERE qr_code = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [qrCode]
  );

  return result.rows[0] || null;
}

async function getBoundDeviceByInventory(
  inventoryId: string,
  executor: DatabaseExecutor = poolExecutor
) {
  const result = await executor.query<{ id: string; ownerId: string; name: string }>(
    `
      SELECT
        id,
        owner_id AS "ownerId",
        name
      FROM devices
      WHERE inventory_id = $1
      LIMIT 1
    `,
    [inventoryId]
  );

  return result.rows[0] || null;
}

async function createDeviceRecord(
  executor: DatabaseExecutor,
  input: {
    ownerId: string;
    name: string;
    location?: unknown;
    inventoryId?: string | null;
    serialNumber?: string | null;
  }
) {
  const ownerId = input.ownerId;
  const name = String(input.name || '').trim();
  const location = input.location ?? null;

  if (!name) {
    throw new HttpError(400, '设备名称不能为空。');
  }

  const duplicate = await executor.query<{ id: string }>(
    'SELECT id FROM devices WHERE owner_id = $1 AND name = $2 LIMIT 1',
    [ownerId, name]
  );

  if (duplicate.rowCount) {
    throw new HttpError(409, '当前账号下已存在同名设备。');
  }

  const result = await executor.query<{ id: string }>(
    `
      INSERT INTO devices (
        id,
        name,
        owner_id,
        inventory_id,
        serial_number,
        location,
        is_on,
        fire_level,
        temp,
        gas,
        smoke,
        flow,
        human_detected,
        vibration
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb,
        FALSE,
        60,
        25,
        0.05,
        2,
        0,
        FALSE,
        FALSE
      )
      RETURNING id
    `,
    [
      randomUUID(),
      name,
      ownerId,
      input.inventoryId ?? null,
      input.serialNumber ?? null,
      JSON.stringify(location),
    ]
  );

  const device = await getDeviceById(result.rows[0].id, executor);

  if (!device) {
    throw new Error('Failed to load created device.');
  }

  return device;
}

async function createOperationLog(
  executor: DatabaseExecutor,
  input: {
    deviceId: string;
    ownerId: string;
    event: string;
    type: 'info' | 'warning' | 'success';
  }
) {
  await executor.query(
    `
      INSERT INTO operation_logs (id, stove_id, owner_id, event, type)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [randomUUID(), input.deviceId, input.ownerId, input.event, input.type]
  );
}

async function createBindingEvent(
  executor: DatabaseExecutor,
  input: {
    inventoryId: string;
    deviceId: string | null;
    ownerId: string;
    eventType: 'bind_success' | 'unbind_success';
    detail?: unknown;
  }
) {
  await executor.query(
    `
      INSERT INTO device_binding_events (
        id,
        inventory_id,
        device_id,
        owner_id,
        event_type,
        detail
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      randomUUID(),
      input.inventoryId,
      input.deviceId,
      input.ownerId,
      input.eventType,
      JSON.stringify(input.detail ?? null),
    ]
  );
}

export async function listDevices(uid: string) {
  const result = await query(
    `
      ${DEVICE_SELECT_SQL}
      WHERE
        d.owner_id = $1
        OR EXISTS (
          SELECT 1
          FROM device_shares ds
          WHERE ds.device_id = d.id AND ds.user_id = $1
        )
        OR EXISTS (
          SELECT 1
          FROM home_device_links hdl
          INNER JOIN home_members hm
            ON hm.home_id = hdl.home_id
          WHERE hdl.device_id = d.id
            AND hm.user_id = $1
        )
      ORDER BY d.updated_at DESC
    `,
    [uid]
  );

  return result.rows;
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
    await query(
      `
        UPDATE device_inventory
        SET status = 'bound', updated_at = NOW()
        WHERE id = $1
      `,
      [inventory.id]
    );
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

    await executor.query(
      `
        UPDATE device_inventory
        SET status = 'bound', updated_at = NOW()
        WHERE id = $1
      `,
      [inventory.id]
    );

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

      const duplicate = await query<{ id: string }>(
        'SELECT id FROM devices WHERE owner_id = $1 AND name = $2 AND id <> $3 LIMIT 1',
        [userId, name, deviceId]
      );

      if (duplicate.rowCount) {
        throw new HttpError(409, '当前账号下已存在同名设备。');
      }

      fields.push({ column: fieldMap[key], value: name });
      continue;
    }

    if (key === 'location') {
      fields.push({
        column: fieldMap[key],
        value: JSON.stringify(body[key] ?? null),
        cast: '::jsonb',
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
    const result = await executor.query<{
      id: string;
      name: string;
      ownerId: string;
      inventoryId: string | null;
      serialNumber: string | null;
    }>(
      `
        SELECT
          d.id,
          d.name,
          d.owner_id AS "ownerId",
          d.inventory_id AS "inventoryId",
          d.serial_number AS "serialNumber"
        FROM devices d
        WHERE d.id = $1
          AND d.owner_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [input.deviceId, input.userId]
    );

    const device = result.rows[0] || null;

    if (!device) {
      throw new HttpError(404, '设备不存在或无权限删除。');
    }

    if (device.inventoryId) {
      await executor.query(
        `
          UPDATE device_inventory
          SET status = 'available', updated_at = NOW()
          WHERE id = $1
        `,
        [device.inventoryId]
      );

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

  const result = await query(
    `
      SELECT
        id,
        stove_id AS "stoveId",
        owner_id AS "ownerId",
        event,
        type,
        created_at AS "createdAt"
      FROM operation_logs
      WHERE stove_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [input.deviceId]
  );

  return result.rows;
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

  const result = await query(
    `
      INSERT INTO operation_logs (id, stove_id, owner_id, event, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        stove_id AS "stoveId",
        owner_id AS "ownerId",
        event,
        type,
        created_at AS "createdAt"
    `,
    [randomUUID(), input.deviceId, device.ownerId, event, type]
  );

  return result.rows[0];
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
