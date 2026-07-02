import {
  query,
  type DatabaseExecutor,
} from '../../db/client';
import { HttpError } from '../../shared/http';

export interface DeviceAccessRow {
  id: string;
  name: string;
  ownerId: string;
  inventoryId: string | null;
  serialNumber: string | null;
  sharedWith: string[];
}

export interface DeviceDetailRow extends DeviceAccessRow {
  ownerDisplayName: string;
  homeId: string | null;
  homeIds: string[];
  location: unknown;
  isOn: boolean;
  fireLevel: number;
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  sharedWithProfiles: Array<{ uid: string; displayName: string }>;
}

export interface DeviceInventoryRow {
  id: string;
  qrCode: string;
  serialNumber: string;
  productModel: string;
  firmwareVersion: string;
  status: 'available' | 'bound' | 'disabled';
}

export interface OwnedDeviceRow {
  id: string;
  name: string;
  ownerId: string;
  inventoryId: string | null;
  serialNumber: string | null;
}

export interface DeviceLogRow {
  id: string;
  stoveId: string;
  ownerId: string;
  displayName: string;
  event: string;
  type: string;
  createdAt: string | Date;
}

export const poolExecutor: DatabaseExecutor = {
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

export async function getDeviceById(
  deviceId: string,
  executor: DatabaseExecutor = poolExecutor
) {
  const result = await executor.query<DeviceDetailRow>(
    `
      ${DEVICE_SELECT_SQL}
      WHERE d.id = $1
      LIMIT 1
    `,
    [deviceId]
  );

  return result.rows[0] || null;
}

export async function listVisibleDevices(uid: string) {
  const result = await query<DeviceDetailRow>(
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

export async function getAccessibleDevice(
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

export async function ensureTargetUserExists(userId: string) {
  const found = await query<{ short_uid: string }>(
    'SELECT short_uid FROM users WHERE short_uid = $1 LIMIT 1',
    [userId]
  );

  if (!found.rowCount) {
    throw new HttpError(404, '目标用户不存在。');
  }
}

export async function getInventoryByQrCode(
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

export async function getBoundDeviceByInventory(
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

export async function findDuplicateDeviceName(
  ownerId: string,
  name: string,
  executor: DatabaseExecutor = poolExecutor,
  excludeDeviceId?: string
) {
  const params = excludeDeviceId ? [ownerId, name, excludeDeviceId] : [ownerId, name];
  const result = await executor.query<{ id: string }>(
    excludeDeviceId
      ? 'SELECT id FROM devices WHERE owner_id = $1 AND name = $2 AND id <> $3 LIMIT 1'
      : 'SELECT id FROM devices WHERE owner_id = $1 AND name = $2 LIMIT 1',
    params
  );

  return result.rowCount > 0;
}

export async function setInventoryStatus(
  inventoryId: string,
  status: DeviceInventoryRow['status'],
  executor: DatabaseExecutor = poolExecutor
) {
  await executor.query(
    `
      UPDATE device_inventory
      SET status = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [inventoryId, status]
  );
}

export async function getOwnedDeviceForDelete(
  deviceId: string,
  userId: string,
  executor: DatabaseExecutor
) {
  const result = await executor.query<OwnedDeviceRow>(
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
    [deviceId, userId]
  );

  return result.rows[0] || null;
}

export async function listDeviceLogsByDeviceId(deviceId: string) {
  const result = await query<DeviceLogRow>(
    `
      SELECT
        ol.id,
        ol.stove_id AS "stoveId",
        ol.owner_id AS "ownerId",
        u.display_name AS "displayName",
        ol.event,
        ol.type,
        ol.created_at AS "createdAt"
      FROM operation_logs ol
      LEFT JOIN users u ON u.short_uid = ol.owner_id
      WHERE ol.stove_id = $1
      ORDER BY ol.created_at DESC
      LIMIT 100
    `,
    [deviceId]
  );

  return result.rows;
}
