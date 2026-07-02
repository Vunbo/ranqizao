import { randomUUID } from 'crypto';
import { query } from '../../db/client';

export async function createHomeRecord(input: { ownerId: string; name: string }) {
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
    [randomUUID(), input.name, input.ownerId]
  );

  return {
    ...result.rows[0],
    ownerDisplayName: input.ownerId,
    members: [],
    memberProfiles: [],
    deviceIds: [],
  };
}

export async function replaceHomeDeviceLinks(input: {
  homeId: string;
  currentIds: string[];
  nextIds: string[];
}) {
  const removedIds = input.currentIds.filter((id) => !input.nextIds.includes(id));
  const addedIds = input.nextIds.filter((id) => !input.currentIds.includes(id));

  if (removedIds.length) {
    await query(
      'DELETE FROM home_device_links WHERE home_id = $1 AND device_id = ANY($2::text[])',
      [input.homeId, removedIds]
    );
  }

  if (addedIds.length) {
    await query(
      `
        INSERT INTO home_device_links (home_id, device_id)
        SELECT $1, UNNEST($2::text[])
        ON CONFLICT (home_id, device_id) DO NOTHING
      `,
      [input.homeId, addedIds]
    );
  }
}

export async function addHomeMemberLink(homeId: string, userId: string) {
  await query(
    `
      INSERT INTO home_members (home_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (home_id, user_id) DO NOTHING
    `,
    [homeId, userId]
  );
}

export async function removeHomeMemberLinks(homeId: string, userIds: string[]) {
  await query(
    'DELETE FROM home_members WHERE home_id = $1 AND user_id = ANY($2::text[])',
    [homeId, userIds]
  );
}

export async function deleteHomeRecord(homeId: string) {
  await query('DELETE FROM homes WHERE id = $1', [homeId]);
}
