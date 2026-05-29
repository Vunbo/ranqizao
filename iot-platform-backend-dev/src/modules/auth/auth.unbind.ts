import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../../database/client';
import { HttpError } from '../../shared/http';
import { normalizePhone } from './auth.helpers';
import { consumePhoneVerificationCode } from './auth.phone';
import { getIdentity } from './auth.repository';
import {
  exchangeMiniProgramCode,
  exchangeWechatAppCode,
  getGoogleProviderAppId,
  getWechatAppProviderAppId,
  getWechatMiniProgramProviderAppId,
  resolveGoogleAppProfile,
} from './auth.third-party';
import type { AuthIdentityRow, IdentityProvider } from './auth.types';

export async function unbindIdentity(input: {
  userPk: string;
  provider: IdentityProvider;
  providerUserId: string;
  providerAppId?: string;
  verificationType:
    | 'password'
    | 'phone_code'
    | 'wechat_mini_program'
    | 'wechat_app'
    | 'google_app';
  currentPassword?: string;
  phone?: string;
  code?: string;
  idToken?: string;
  accessToken?: string;
  authResult?: unknown;
  userInfo?: unknown;
}) {
  const providerUserId = String(input.providerUserId || '').trim();
  const providerAppId = String(input.providerAppId || '').trim();

  if (!providerUserId) {
    throw new HttpError(400, '解绑目标不能为空。');
  }

  const identityResult = await query<AuthIdentityRow>(
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
        AND provider = $2
        AND provider_user_id = $3
        AND provider_app_id = $4
      LIMIT 1
    `,
    [input.userPk, input.provider, providerUserId, providerAppId]
  );

  const identity = identityResult.rows[0];
  if (!identity) {
    throw new HttpError(404, '未找到可解绑的登录方式。');
  }

  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM auth_identities WHERE user_pk = $1',
    [input.userPk]
  );
  const identityCount = Number(countResult.rows[0]?.count || 0);

  if (identityCount <= 1) {
    throw new HttpError(400, '当前账号至少需要保留一种登录方式。');
  }

  if (input.verificationType === 'password') {
    const passwordIdentityResult = await query<AuthIdentityRow>(
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
        LIMIT 1
      `,
      [input.userPk]
    );

    const passwordIdentity = passwordIdentityResult.rows[0];
    if (!passwordIdentity?.password_hash) {
      throw new HttpError(400, '当前账号不支持使用密码进行二次校验。');
    }

    const matched = await bcrypt.compare(
      String(input.currentPassword || ''),
      passwordIdentity.password_hash
    );
    if (!matched) {
      throw new HttpError(400, '密码校验失败。');
    }
  } else if (input.verificationType === 'phone_code') {
    const phone = normalizePhone(input.phone || '');

    if (!phone) {
      throw new HttpError(400, '手机号不能为空。');
    }

    const phoneIdentity = await getIdentity('phone_sms', phone, '');
    if (!phoneIdentity || phoneIdentity.user_pk !== input.userPk) {
      throw new HttpError(400, '该手机号未绑定当前账号。');
    }

    await consumePhoneVerificationCode({
      phone,
      code: String(input.code || ''),
      purpose: 'unbind',
    });
  } else if (input.verificationType === 'wechat_mini_program') {
    const session = await exchangeMiniProgramCode(String(input.code || ''));
    const miniIdentity = await getIdentity(
      'wechat_mini_program',
      session.openid,
      getWechatMiniProgramProviderAppId()
    );

    if (!miniIdentity || miniIdentity.user_pk !== input.userPk) {
      throw new HttpError(400, '微信小程序二次校验失败。');
    }
  } else if (input.verificationType === 'wechat_app') {
    const session = await exchangeWechatAppCode(String(input.code || ''));
    const appIdentity = await getIdentity(
      'wechat_app',
      session.openid,
      getWechatAppProviderAppId()
    );

    if (!appIdentity || appIdentity.user_pk !== input.userPk) {
      throw new HttpError(400, '微信 App 二次校验失败。');
    }
  } else if (input.verificationType === 'google_app') {
    const googleProfile = await resolveGoogleAppProfile(input);
    const googleIdentity = await getIdentity(
      'google_app',
      googleProfile.providerUserId,
      getGoogleProviderAppId()
    );

    if (!googleIdentity || googleIdentity.user_pk !== input.userPk) {
      throw new HttpError(400, 'Google 二次校验失败。');
    }
  } else {
    throw new HttpError(400, '不支持的二次校验方式。');
  }

  await withTransaction(async (executor) => {
    await executor.query('DELETE FROM auth_identities WHERE id = $1', [identity.id]);

    if (identity.provider === 'email_password') {
      const remainingEmail = await executor.query<{ providerUserId: string }>(
        `
          SELECT provider_user_id AS "providerUserId"
          FROM auth_identities
          WHERE user_pk = $1
            AND provider = 'email_password'
          ORDER BY is_primary DESC, created_at ASC
          LIMIT 1
        `,
        [input.userPk]
      );

      const nextEmail = remainingEmail.rows[0]?.providerUserId || null;
      await executor.query(
        `
          UPDATE users
          SET
            primary_email = $2,
            email = $2,
            password_hash = NULL,
            updated_at = NOW()
          WHERE id = $1
        `,
        [input.userPk, nextEmail]
      );
    }

    if (identity.provider === 'phone_sms') {
      const remainingPhone = await executor.query<{ providerUserId: string }>(
        `
          SELECT provider_user_id AS "providerUserId"
          FROM auth_identities
          WHERE user_pk = $1
            AND provider = 'phone_sms'
          ORDER BY is_primary DESC, created_at ASC
          LIMIT 1
        `,
        [input.userPk]
      );

      const nextPhone = remainingPhone.rows[0]?.providerUserId || null;
      await executor.query(
        `
          UPDATE users
          SET primary_phone = $2, updated_at = NOW()
          WHERE id = $1
        `,
        [input.userPk, nextPhone]
      );
    }
  });

  return { ok: true };
}
