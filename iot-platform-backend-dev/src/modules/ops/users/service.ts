import { query } from '../../../database/client';
import { HttpError } from '../../../shared/http';
import { mapDeviceRowToView } from '../common/device-view';

interface UserListRow {
  userId: string;
  uid: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  status: string;
  bindCount: string;
  shareCount: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserDeviceRow {
  id: string;
  sn: string | null;
  name: string;
  model: string | null;
  ownerUid: string;
  ownerDisplayName: string;
  firmwareVersion: string | null;
  inventoryStatus: string | null;
  location: unknown;
  isOn: boolean;
  fireLevel: number;
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
  locked: boolean;
  valveStatus: string;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function listOpsUsers(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = Math.min(normalizePage(input.pageSize, 20), 100);
  const search = String(input.search || '').trim().toLowerCase();
  const status = String(input.status || '').trim();

  const result = await query<UserListRow>(
    `
      SELECT
        u.id AS "userId",
        u.short_uid AS uid,
        u.display_name AS "displayName",
        u.primary_phone AS phone,
        u.primary_email AS email,
        u.status,
        (
          SELECT COUNT(*)::text
          FROM devices d
          WHERE d.owner_id = u.short_uid
        ) AS "bindCount",
        (
          SELECT COUNT(*)::text
          FROM device_shares ds
          WHERE ds.user_id = u.short_uid
        ) AS "shareCount",
        (
          SELECT MAX(ai.last_login_at)::text
          FROM auth_identities ai
          WHERE ai.user_pk = u.id
        ) AS "lastLoginAt",
        u.created_at AS "createdAt"
      FROM users u
      ORDER BY u.created_at DESC
    `
  );

  const filtered = result.rows.filter((row) => {
    const matchesSearch = !search
      || row.uid.toLowerCase().includes(search)
      || row.displayName.toLowerCase().includes(search)
      || String(row.phone || '').toLowerCase().includes(search)
      || String(row.email || '').toLowerCase().includes(search);
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesStatus;
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize).map((row) => ({
      userId: row.userId,
      uid: row.uid,
      displayName: row.displayName,
      phone: row.phone,
      email: row.email,
      status: row.status,
      bindCount: Number(row.bindCount || 0),
      shareCount: Number(row.shareCount || 0),
      lastLoginAt: row.lastLoginAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function getOpsUser(uid: string) {
  const userResult = await query<{
    userId: string;
    uid: string;
    displayName: string;
    phone: string | null;
    email: string | null;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
  }>(
    `
      SELECT
        u.id AS "userId",
        u.short_uid AS uid,
        u.display_name AS "displayName",
        u.primary_phone AS phone,
        u.primary_email AS email,
        u.status,
        (
          SELECT MAX(ai.last_login_at)::text
          FROM auth_identities ai
          WHERE ai.user_pk = u.id
        ) AS "lastLoginAt",
        u.created_at AS "createdAt"
      FROM users u
      WHERE u.short_uid = $1
      LIMIT 1
    `,
    [uid]
  );

  const user = userResult.rows[0] || null;
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const boundDevicesResult = await query<UserDeviceRow>(
    `
      SELECT
        d.id,
        COALESCE(d.serial_number, di.serial_number) AS "sn",
        d.name,
        di.product_model AS "model",
        d.owner_id AS "ownerUid",
        owner_user.display_name AS "ownerDisplayName",
        di.firmware_version AS "firmwareVersion",
        di.status AS "inventoryStatus",
        d.location,
        d.is_on AS "isOn",
        d.fire_level AS "fireLevel",
        d.temp,
        d.gas,
        d.smoke,
        d.flow,
        d.human_detected AS "humanDetected",
        d.vibration,
        d.locked,
        d.valve_status AS "valveStatus",
        d.last_heartbeat_at AS "lastHeartbeatAt",
        d.created_at AS "createdAt",
        d.updated_at AS "updatedAt"
      FROM devices d
      INNER JOIN users owner_user
        ON owner_user.short_uid = d.owner_id
      LEFT JOIN device_inventory di
        ON di.id = d.inventory_id
      WHERE d.owner_id = $1
      ORDER BY d.updated_at DESC
    `,
    [uid]
  );

  const sharedDevicesResult = await query<{
    id: string;
    sn: string | null;
    name: string;
    model: string | null;
    ownerUid: string;
    ownerDisplayName: string;
    createdAt: string;
  }>(
    `
      SELECT
        d.id,
        COALESCE(d.serial_number, di.serial_number) AS "sn",
        d.name,
        di.product_model AS "model",
        d.owner_id AS "ownerUid",
        owner_user.display_name AS "ownerDisplayName",
        ds.created_at AS "createdAt"
      FROM device_shares ds
      INNER JOIN devices d
        ON d.id = ds.device_id
      INNER JOIN users owner_user
        ON owner_user.short_uid = d.owner_id
      LEFT JOIN device_inventory di
        ON di.id = d.inventory_id
      WHERE ds.user_id = $1
      ORDER BY ds.created_at DESC
    `,
    [uid]
  );

  return {
    user,
    boundDevices: boundDevicesResult.rows.map((row) => mapDeviceRowToView(row)),
    sharedDevices: sharedDevicesResult.rows.map((row) => ({
      id: row.id,
      sn: row.sn || '',
      name: row.name,
      model: row.model || '',
      ownerUid: row.ownerUid,
      ownerDisplayName: row.ownerDisplayName,
      permissions: ['view', 'control'],
      createdAt: row.createdAt,
    })),
  };
}
