import { randomUUID } from 'crypto';
import { query, type DatabaseExecutor } from '../../db/client';
import { HttpError } from '../../shared/http';
import { createShortUid, normalizeEmail } from './auth.helpers';
import type {
  AuthIdentityRow,
  AuthIdentityUserRow,
  IdentityProvider,
  UserRow,
} from './auth.types';

export interface CreateUserRowInput {
  displayName?: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  photoURL?: string | null;
  legacyEmail?: string | null;
  legacyPasswordHash?: string | null;
}

export interface CreateIdentityInput {
  userPk: string;
  provider: IdentityProvider;
  providerUserId: string;
  providerAppId?: string;
  unionId?: string | null;
  passwordHash?: string | null;
  isVerified?: boolean;
  isPrimary?: boolean;
  meta?: Record<string, unknown> | null;
}

const USER_COLUMNS_SQL = `
  SELECT
    id,
    short_uid,
    primary_email,
    primary_phone,
    display_name,
    photo_url,
    status
  FROM users
`;

const AUTH_IDENTITY_WITH_USER_COLUMNS_SQL = `
  SELECT
    ai.id AS "identityId",
    ai.user_pk,
    ai.provider,
    ai.provider_user_id,
    ai.provider_app_id,
    ai.union_id,
    ai.password_hash,
    ai.is_verified,
    ai.is_primary,
    ai.meta,
    u.id,
    u.short_uid,
    u.primary_email,
    u.primary_phone,
    u.display_name,
    u.photo_url,
    u.status
  FROM auth_identities ai
  INNER JOIN users u ON u.id = ai.user_pk
`;

export async function createUserRow(
  executor: DatabaseExecutor,
  input: CreateUserRowInput
) {
  let createdUser: UserRow | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shortUid = createShortUid();
    const displayName = String(input.displayName || '').trim() || shortUid;

    try {
      const inserted = await executor.query<UserRow>(
        `
          INSERT INTO users (
            id,
            short_uid,
            email,
            password_hash,
            primary_email,
            primary_phone,
            display_name,
            photo_url,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
          RETURNING
            id,
            short_uid,
            primary_email,
            primary_phone,
            display_name,
            photo_url,
            status
        `,
        [
          randomUUID(),
          shortUid,
          input.legacyEmail ?? input.primaryEmail ?? null,
          input.legacyPasswordHash ?? null,
          input.primaryEmail ?? null,
          input.primaryPhone ?? null,
          displayName,
          input.photoURL ?? null,
        ]
      );

      createdUser = inserted.rows[0] || null;
      break;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('users_short_uid_key')) {
        throw error;
      }
    }
  }

  if (!createdUser) {
    throw new HttpError(500, '用户创建失败，请重试。');
  }

  return createdUser;
}

export async function getUserById(userPk: string) {
  const result = await query<UserRow>(
    `
      ${USER_COLUMNS_SQL}
      WHERE id = $1
      LIMIT 1
    `,
    [userPk]
  );

  return result.rows[0] || null;
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const result = await query<UserRow>(
    `
      ${USER_COLUMNS_SQL}
      WHERE primary_email = $1
         OR email = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return result.rows[0] || null;
}

export async function getIdentity(
  provider: IdentityProvider,
  providerUserId: string,
  providerAppId = ''
) {
  const result = await query<AuthIdentityUserRow>(
    `
      ${AUTH_IDENTITY_WITH_USER_COLUMNS_SQL}
      WHERE ai.provider = $1
        AND ai.provider_user_id = $2
        AND ai.provider_app_id = $3
      LIMIT 1
    `,
    [provider, providerUserId, providerAppId]
  );

  return result.rows[0] || null;
}

export async function getWechatIdentityByUnionId(unionId: string) {
  const result = await query<AuthIdentityUserRow>(
    `
      ${AUTH_IDENTITY_WITH_USER_COLUMNS_SQL}
      WHERE ai.union_id = $1
        AND ai.provider IN ('wechat_app', 'wechat_mini_program')
      ORDER BY ai.created_at ASC
      LIMIT 1
    `,
    [unionId]
  );

  return result.rows[0] || null;
}

export async function createIdentity(
  executor: DatabaseExecutor,
  input: CreateIdentityInput
) {
  const inserted = await executor.query<AuthIdentityRow>(
    `
      INSERT INTO auth_identities (
        id,
        user_pk,
        provider,
        provider_user_id,
        provider_app_id,
        union_id,
        password_hash,
        is_verified,
        is_primary,
        meta
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
      RETURNING
        id,
        user_pk,
        provider,
        provider_user_id,
        provider_app_id,
        union_id,
        password_hash,
        is_verified,
        is_primary,
        meta
    `,
    [
      randomUUID(),
      input.userPk,
      input.provider,
      input.providerUserId,
      input.providerAppId ?? '',
      input.unionId ?? null,
      input.passwordHash ?? null,
      input.isVerified ?? false,
      input.isPrimary ?? false,
      JSON.stringify(input.meta ?? null),
    ]
  );

  return inserted.rows[0];
}

export async function setPrimaryEmail(
  executor: DatabaseExecutor,
  userPk: string,
  email: string,
  passwordHash?: string | null
) {
  await executor.query(
    `
      UPDATE users
      SET
        primary_email = $2,
        email = COALESCE(email, $2),
        password_hash = COALESCE($3, password_hash),
        updated_at = NOW()
      WHERE id = $1
    `,
    [userPk, email, passwordHash ?? null]
  );
}

export async function setPrimaryPhone(
  executor: DatabaseExecutor,
  userPk: string,
  phone: string
) {
  await executor.query(
    `
      UPDATE users
      SET primary_phone = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [userPk, phone]
  );
}

export async function markIdentityLogin(identityId: string) {
  await query(
    'UPDATE auth_identities SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
    [identityId]
  );
}
