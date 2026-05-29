import { query } from '../../database/client';
import { HttpError } from '../../shared/http';
import { toAuthUser } from './auth.helpers';
import { getUserById } from './auth.repository';
import type { IdentityProvider, UserRow } from './auth.types';

export async function listUserIdentities(userPk: string) {
  const result = await query<{
    provider: IdentityProvider;
    providerUserId: string;
    providerAppId: string;
    isVerified: boolean;
    isPrimary: boolean;
  }>(
    `
      SELECT
        provider,
        provider_user_id AS "providerUserId",
        provider_app_id AS "providerAppId",
        is_verified AS "isVerified",
        is_primary AS "isPrimary"
      FROM auth_identities
      WHERE user_pk = $1
      ORDER BY created_at ASC
    `,
    [userPk]
  );

  return result.rows;
}

export async function getCurrentUser(userPk: string) {
  const user = await getUserById(userPk);

  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  return toAuthUser(user);
}

export async function updateCurrentUserProfile(input: {
  userPk: string;
  displayName: string;
}) {
  const displayName = String(input.displayName || '').trim();

  if (!displayName) {
    throw new HttpError(400, '名称不能为空。');
  }

  const result = await query<UserRow>(
    `
      UPDATE users
      SET display_name = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        short_uid,
        primary_email,
        primary_phone,
        display_name,
        photo_url,
        status
    `,
    [input.userPk, displayName]
  );

  const user = result.rows[0] || null;
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  return toAuthUser(user);
}
