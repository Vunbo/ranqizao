import { query } from '../../../db/client';
import { OPS_DEVICE_SELECT_SQL, type OpsDeviceRow } from '../devices/device-repository';

export interface UserListRow {
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

export interface OpsUserDetailRow {
  userId: string;
  uid: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SharedDeviceRow {
  id: string;
  sn: string | null;
  name: string;
  model: string | null;
  ownerUid: string;
  ownerDisplayName: string;
  createdAt: string;
}

export async function listOpsUserRows() {
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

  return result.rows;
}

export async function getOpsUserRow(uid: string) {
  const result = await query<OpsUserDetailRow>(
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

  return result.rows[0] || null;
}

export async function listBoundDeviceRowsForUser(uid: string) {
  const result = await query<OpsDeviceRow>(
    `
      ${OPS_DEVICE_SELECT_SQL}
      WHERE d.owner_id = $1
      ORDER BY d.updated_at DESC
    `,
    [uid]
  );

  return result.rows;
}

export async function listSharedDeviceRowsForUser(uid: string) {
  const result = await query<SharedDeviceRow>(
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

  return result.rows;
}
