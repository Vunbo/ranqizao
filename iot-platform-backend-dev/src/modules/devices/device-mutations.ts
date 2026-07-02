import { randomUUID } from 'crypto';
import { type DatabaseExecutor } from '../../db/client';
import { HttpError } from '../../shared/http';
import {
  deriveLocationRegionPath,
  normalizeLocationForStorage,
} from '../../shared/location';
import {
  findDuplicateDeviceName,
  getDeviceById,
  type DeviceLogRow,
} from './device-repository';

export async function createDeviceRecord(
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
  const location = normalizeLocationForStorage(input.location);
  const regionPath = location
    ? deriveLocationRegionPath(location, { includeDistrict: true })
    : null;

  if (!name) {
    throw new HttpError(400, '设备名称不能为空。');
  }

  const hasDuplicate = await findDuplicateDeviceName(ownerId, name, executor);
  if (hasDuplicate) {
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
        region_path,
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
        $7,
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
      regionPath,
    ]
  );

  const device = await getDeviceById(result.rows[0].id, executor);

  if (!device) {
    throw new Error('Failed to load created device.');
  }

  return device;
}

export async function insertDeviceLog(
  executor: DatabaseExecutor,
  input: {
    deviceId: string;
    ownerId: string;
    event: string;
    type: 'info' | 'warning' | 'success';
  }
) {
  const result = await executor.query<DeviceLogRow>(
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
    [randomUUID(), input.deviceId, input.ownerId, input.event, input.type]
  );

  return result.rows[0];
}

export async function createOperationLog(
  executor: DatabaseExecutor,
  input: {
    deviceId: string;
    ownerId: string;
    event: string;
    type: 'info' | 'warning' | 'success';
  }
) {
  await insertDeviceLog(executor, input);
}

export async function createBindingEvent(
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
