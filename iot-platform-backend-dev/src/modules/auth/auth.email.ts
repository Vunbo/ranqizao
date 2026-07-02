import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../../db/client';
import { signAuthToken } from '../../shared/auth';
import { HttpError } from '../../shared/http';
import { normalizeEmail, toAuthUser } from './auth.helpers';
import {
  createIdentity,
  createUserRow,
  getIdentity,
  getUserById,
  markIdentityLogin,
  setPrimaryEmail,
} from './auth.repository';
import type { AuthIdentityRow } from './auth.types';

export async function registerUser(input: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || '');
  const displayName = String(input.displayName || '').trim();

  if (!email || !password) {
    throw new HttpError(400, '邮箱和密码不能为空。');
  }

  if (password.length < 6) {
    throw new HttpError(400, '密码长度不能少于 6 位。');
  }

  const existingIdentity = await getIdentity('email_password', email, '');
  if (existingIdentity) {
    throw new HttpError(409, '该邮箱已注册。');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdUser = await withTransaction(async (executor) => {
    const user = await createUserRow(executor, {
      displayName,
      primaryEmail: email,
      legacyEmail: email,
      legacyPasswordHash: passwordHash,
    });

    await createIdentity(executor, {
      userPk: user.id,
      provider: 'email_password',
      providerUserId: email,
      passwordHash,
      isVerified: true,
      isPrimary: true,
    });

    return user;
  });

  const user = toAuthUser(createdUser);
  return {
    token: signAuthToken(user),
    user,
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || '');

  if (!email || !password) {
    throw new HttpError(400, '邮箱和密码不能为空。');
  }

  const identity = await getIdentity('email_password', email, '');
  if (!identity || !identity.password_hash) {
    throw new HttpError(401, '账号或密码错误。');
  }

  const matched = await bcrypt.compare(password, identity.password_hash);
  if (!matched) {
    throw new HttpError(401, '账号或密码错误。');
  }

  await markIdentityLogin(identity.identityId);
  const user = toAuthUser(identity);
  return {
    token: signAuthToken(user),
    user,
  };
}

export async function bindEmailToUser(input: {
  userPk: string;
  email: string;
  password: string;
}) {
  const user = await getUserById(input.userPk);
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const email = normalizeEmail(input.email);
  const password = String(input.password || '');

  if (!email || !password) {
    throw new HttpError(400, '邮箱和密码不能为空。');
  }

  if (password.length < 6) {
    throw new HttpError(400, '密码长度不能少于 6 位。');
  }

  const existingIdentity = await getIdentity('email_password', email, '');
  if (existingIdentity && existingIdentity.user_pk !== input.userPk) {
    throw new HttpError(409, '该邮箱已绑定其他账号。');
  }

  if (existingIdentity && existingIdentity.user_pk === input.userPk) {
    throw new HttpError(409, '当前账号已绑定该邮箱。');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await withTransaction(async (executor) => {
    await createIdentity(executor, {
      userPk: input.userPk,
      provider: 'email_password',
      providerUserId: email,
      passwordHash,
      isVerified: true,
      isPrimary: user.primary_email ? false : true,
    });

    if (!user.primary_email) {
      await setPrimaryEmail(executor, input.userPk, email, passwordHash);
    }
  });

  return { ok: true };
}

export async function changePassword(input: {
  userPk: string;
  currentPassword: string;
  newPassword: string;
}) {
  const user = await getUserById(input.userPk);
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const currentPassword = String(input.currentPassword || '');
  const newPassword = String(input.newPassword || '');

  if (!currentPassword || !newPassword) {
    throw new HttpError(400, '旧密码和新密码不能为空。');
  }

  if (newPassword.length < 6) {
    throw new HttpError(400, '新密码长度不能少于 6 位。');
  }

  const identities = await query<AuthIdentityRow>(
    `
      SELECT
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
      FROM auth_identities
      WHERE user_pk = $1
        AND provider = 'email_password'
      ORDER BY is_primary DESC, created_at ASC
    `,
    [input.userPk]
  );

  const passwordIdentity = identities.rows[0];
  if (!passwordIdentity || !passwordIdentity.password_hash) {
    throw new HttpError(400, '当前账号未绑定邮箱密码登录，无法修改密码。');
  }

  const matched = await bcrypt.compare(currentPassword, passwordIdentity.password_hash);
  if (!matched) {
    throw new HttpError(400, '旧密码错误。');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await withTransaction(async (executor) => {
    await executor.query(
      `
        UPDATE auth_identities
        SET password_hash = $2, updated_at = NOW()
        WHERE user_pk = $1
          AND provider = 'email_password'
      `,
      [input.userPk, newPasswordHash]
    );

    await executor.query(
      `
        UPDATE users
        SET password_hash = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [input.userPk, newPasswordHash]
    );
  });

  return { ok: true };
}
