import { query } from '../../database/client';
import { HttpError } from '../../shared/http';

export interface HomeAccessRow {
  id: string;
  ownerId: string;
}

export async function getAccessibleHome(homeId: string, userId: string) {
  const result = await query<HomeAccessRow>(
    `
      SELECT
        h.id,
        h.owner_id AS "ownerId"
      FROM homes h
      WHERE h.id = $1
        AND (
          h.owner_id = $2
          OR EXISTS (
            SELECT 1
            FROM home_members hm
            WHERE hm.home_id = h.id AND hm.user_id = $2
          )
        )
      LIMIT 1
    `,
    [homeId, userId]
  );

  const home = result.rows[0] || null;
  return { home, isOwner: home?.ownerId === userId };
}

export async function ensureTargetUserExists(userId: string) {
  const userExists = await query<{ short_uid: string }>(
    'SELECT short_uid FROM users WHERE short_uid = $1 LIMIT 1',
    [userId]
  );

  if (!userExists.rowCount) {
    throw new HttpError(404, '目标用户不存在。');
  }
}

export async function listVisibleHomes(uid: string) {
  const result = await query(
    `
      SELECT
        h.id,
        h.name,
        h.owner_id AS "ownerId",
        owner_user.display_name AS "ownerDisplayName",
        h.created_at AS "createdAt",
        COALESCE(
          ARRAY(
            SELECT hm.user_id
            FROM home_members hm
            WHERE hm.home_id = h.id
            ORDER BY hm.user_id
          ),
          ARRAY[]::TEXT[]
        ) AS members,
        COALESCE(
          (
            SELECT JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'uid', member_user.short_uid,
                'displayName', member_user.display_name
              )
              ORDER BY hm.created_at
            )
            FROM home_members hm
            INNER JOIN users member_user
              ON member_user.short_uid = hm.user_id
            WHERE hm.home_id = h.id
          ),
          '[]'::jsonb
        ) AS "memberProfiles",
        COALESCE(
          ARRAY(
            SELECT hdl.device_id
            FROM home_device_links hdl
            WHERE hdl.home_id = h.id
            ORDER BY hdl.created_at
          ),
          ARRAY[]::TEXT[]
        ) AS "deviceIds"
      FROM homes h
      INNER JOIN users owner_user
        ON owner_user.short_uid = h.owner_id
      WHERE
        h.owner_id = $1
        OR EXISTS (
          SELECT 1
          FROM home_members hm
          WHERE hm.home_id = h.id AND hm.user_id = $1
        )
      ORDER BY h.created_at DESC
    `,
    [uid]
  );

  return result.rows;
}

export async function findDuplicateHomeName(ownerId: string, name: string) {
  const duplicate = await query<{ id: string }>(
    'SELECT id FROM homes WHERE owner_id = $1 AND name = $2 LIMIT 1',
    [ownerId, name]
  );

  return Boolean(duplicate.rowCount);
}

export async function listOwnedDeviceIds(ownerId: string) {
  const result = await query<{ id: string }>(
    'SELECT id FROM devices WHERE owner_id = $1',
    [ownerId]
  );

  return result.rows.map((row) => row.id);
}

export async function listHomeLinkedDeviceIds(homeId: string) {
  const result = await query<{ deviceId: string }>(
    `
      SELECT device_id AS "deviceId"
      FROM home_device_links
      WHERE home_id = $1
    `,
    [homeId]
  );

  return result.rows.map((row) => row.deviceId);
}
