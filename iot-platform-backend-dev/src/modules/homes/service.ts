import { randomUUID } from 'crypto';
import { query } from '../../database/client';
import { HttpError } from '../../shared/http';

interface HomeAccessRow {
  id: string;
  ownerId: string;
}

async function getAccessibleHome(homeId: string, userId: string) {
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

async function ensureTargetUserExists(userId: string) {
  const userExists = await query<{ short_uid: string }>(
    'SELECT short_uid FROM users WHERE short_uid = $1 LIMIT 1',
    [userId]
  );

  if (!userExists.rowCount) {
    throw new HttpError(404, '目标用户不存在。');
  }
}

export async function listHomes(uid: string) {
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

export async function createHome(input: { ownerId: string; name: string }) {
  const ownerId = input.ownerId;
  const name = String(input.name || '').trim();

  if (!name) {
    throw new HttpError(400, '家庭名称不能为空。');
  }

  const duplicate = await query<{ id: string }>(
    'SELECT id FROM homes WHERE owner_id = $1 AND name = $2 LIMIT 1',
    [ownerId, name]
  );

  if (duplicate.rowCount) {
    throw new HttpError(409, '当前账号下已存在同名家庭。');
  }

  const result = await query(
    `
      INSERT INTO homes (id, name, owner_id)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        name,
        owner_id AS "ownerId",
        created_at AS "createdAt"
    `,
    [randomUUID(), name, ownerId]
  );

  return {
    ...result.rows[0],
    ownerDisplayName: ownerId,
    members: [],
    memberProfiles: [],
    deviceIds: [],
  };
}

export async function updateHomeDeviceLinks(input: {
  userId: string;
  homeId: string;
  deviceIds: unknown;
}) {
  const { userId, homeId } = input;
  const { home, isOwner } = await getAccessibleHome(homeId, userId);

  if (!home || !isOwner) {
    throw new HttpError(404, '家庭不存在或无权限操作。');
  }

  if (!Array.isArray(input.deviceIds)) {
    throw new HttpError(400, '设备关联数据格式不正确。');
  }

  const nextDeviceIds = [...new Set(input.deviceIds.map((item: unknown) => String(item)))];
  const ownedDeviceRows = await query<{ id: string }>(
    'SELECT id FROM devices WHERE owner_id = $1',
    [userId]
  );
  const ownedDeviceIds = new Set(ownedDeviceRows.rows.map((row) => row.id));

  if (nextDeviceIds.some((deviceId) => !ownedDeviceIds.has(deviceId))) {
    throw new HttpError(400, '只能关联自己名下的设备。');
  }

  const currentRows = await query<{ deviceId: string }>(
    `
      SELECT device_id AS "deviceId"
      FROM home_device_links
      WHERE home_id = $1
    `,
    [homeId]
  );
  const currentIds = currentRows.rows.map((row) => row.deviceId);
  const removedIds = currentIds.filter((id) => !nextDeviceIds.includes(id));
  const addedIds = nextDeviceIds.filter((id) => !currentIds.includes(id));

  if (removedIds.length) {
    await query(
      'DELETE FROM home_device_links WHERE home_id = $1 AND device_id = ANY($2::text[])',
      [homeId, removedIds]
    );
  }

  if (addedIds.length) {
    await query(
      `
        INSERT INTO home_device_links (home_id, device_id)
        SELECT $1, UNNEST($2::text[])
        ON CONFLICT (home_id, device_id) DO NOTHING
      `,
      [homeId, addedIds]
    );
  }

  return { ok: true };
}

export async function addHomeMember(input: {
  userId: string;
  homeId: string;
  targetUserId: string;
}) {
  const { userId, homeId } = input;
  const targetUserId = String(input.targetUserId || '').trim();
  const { home, isOwner } = await getAccessibleHome(homeId, userId);

  if (!home || !isOwner) {
    throw new HttpError(404, '家庭不存在或无权限共享。');
  }

  if (!targetUserId || targetUserId.length !== 8) {
    throw new HttpError(400, '请输入 8 位用户 UID。');
  }

  if (targetUserId === userId) {
    throw new HttpError(400, '不能添加自己。');
  }

  await ensureTargetUserExists(targetUserId);

  await query(
    `
      INSERT INTO home_members (home_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (home_id, user_id) DO NOTHING
    `,
    [homeId, targetUserId]
  );

  return { ok: true };
}

export async function removeHomeMembers(input: {
  userId: string;
  homeId: string;
  targetUserIds: unknown;
}) {
  const { userId, homeId } = input;
  const { home, isOwner } = await getAccessibleHome(homeId, userId);

  if (!home || !isOwner) {
    throw new HttpError(404, '家庭不存在或无权限操作。');
  }

  if (!Array.isArray(input.targetUserIds)) {
    throw new HttpError(400, '成员数据格式不正确。');
  }

  const targetUserIds = [...new Set(input.targetUserIds.map((item: unknown) => String(item)))];
  if (!targetUserIds.length) {
    throw new HttpError(400, '请选择要移除的成员。');
  }

  await query(
    'DELETE FROM home_members WHERE home_id = $1 AND user_id = ANY($2::text[])',
    [homeId, targetUserIds]
  );

  return { ok: true };
}

export async function deleteHome(input: { userId: string; homeId: string }) {
  const { home, isOwner } = await getAccessibleHome(input.homeId, input.userId);

  if (!home || !isOwner) {
    throw new HttpError(404, '家庭不存在或无权限删除。');
  }

  await query('DELETE FROM homes WHERE id = $1', [input.homeId]);

  return { ok: true };
}
