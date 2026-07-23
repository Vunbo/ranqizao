import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { query, withTransaction } from '../../db/client';
import { signAuthToken } from '../../shared/auth';
import { HttpError } from '../../shared/http';
import { sendAliyunSmsCode } from './sms/aliyun-sms';
import { createPhoneCode, normalizePhone, toAuthUser } from './auth.helpers';
import {
  createIdentity,
  createUserRow,
  getIdentity,
  getUserById,
  markIdentityLogin,
  setPrimaryPhone,
} from './auth.repository';
import type {
  PhoneVerificationPurpose,
  VerificationCodeRow,
} from './auth.types';

export async function createPhoneVerificationCode(input: {
  phone: string;
  purpose: PhoneVerificationPurpose;
}) {
  const latest = await query<{ createdAt: string }>(
    `
      SELECT created_at AS "createdAt"
      FROM auth_verification_codes
      WHERE target_type = 'phone'
        AND target_value = $1
        AND purpose = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [input.phone, input.purpose]
  );
  const lastSentAt = latest.rows[0]?.createdAt;
  if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < 60_000) {
    throw new HttpError(429, '验证码发送过于频繁，请稍后再试。');
  }
  if (env.isProduction && !env.aliyunSms.enabled) {
    throw new HttpError(503, '短信服务未配置，请联系管理员。');
  }
  const code = createPhoneCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await query(
    `
      UPDATE auth_verification_codes
      SET used_at = NOW()
      WHERE target_type = 'phone'
        AND target_value = $1
        AND purpose = $2
        AND used_at IS NULL
    `,
    [input.phone, input.purpose]
  );
  await query(
    `
      INSERT INTO auth_verification_codes (
        id,
        target_type,
        target_value,
        purpose,
        code_hash,
        expires_at
      )
      VALUES ($1, 'phone', $2, $3, $4, $5)
    `,
    [randomUUID(), input.phone, input.purpose, codeHash, expiresAt]
  );
  if (env.aliyunSms.enabled) {
    try {
      await sendAliyunSmsCode({ phone: input.phone, code });
    } catch (error) {
      await query(
        'UPDATE auth_verification_codes SET used_at = NOW() WHERE target_value = $1 AND purpose = $2 AND used_at IS NULL',
        [input.phone, input.purpose]
      );
      throw error;
    }
  } else if (!env.isProduction) {
    console.log(`[DEV] phone verification code for ${input.phone}: ${code}`);
  }
  return {
    ok: true,
    expiresIn: 300,
    debugCode: !env.isProduction && !env.aliyunSms.enabled ? code : undefined,
  };
}
export async function consumePhoneVerificationCode(input: {
  phone: string;
  code: string;
  purpose: PhoneVerificationPurpose;
}) {
  const result = await query<VerificationCodeRow>(
    `
      SELECT
        id,
        target_type AS "targetType",
        target_value AS "targetValue",
        purpose,
        code_hash AS "codeHash",
        expires_at AS "expiresAt",
        used_at AS "usedAt"
      FROM auth_verification_codes
      WHERE target_type = 'phone'
        AND target_value = $1
        AND purpose = $2
        AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [input.phone, input.purpose]
  );

  const record = result.rows[0];
  if (!record) {
    throw new HttpError(400, '验证码无效或已过期。');
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    throw new HttpError(400, '验证码已过期。');
  }

  const matched = await bcrypt.compare(String(input.code || ''), record.codeHash);
  if (!matched) {
    throw new HttpError(400, '验证码错误。');
  }

  await query(
    'UPDATE auth_verification_codes SET used_at = NOW() WHERE id = $1',
    [record.id]
  );
}

export async function sendPhoneLoginCode(input: { phone: string }) {
  const phone = normalizePhone(input.phone);

  if (!phone) {
    throw new HttpError(400, '手机号不能为空。');
  }

  return createPhoneVerificationCode({
    phone,
    purpose: 'login',
  });
}

export async function sendPhoneRegistrationCode(input: { phone: string }) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new HttpError(400, '手机号不能为空。');
  return createPhoneVerificationCode({ phone, purpose: 'register' });
}
export async function loginPhoneUser(input: { phone: string; code: string }) {
  const phone = normalizePhone(input.phone);
  const code = String(input.code || '').trim();

  if (!phone || !code) {
    throw new HttpError(400, '手机号和验证码不能为空。');
  }

  await consumePhoneVerificationCode({
    phone,
    code,
    purpose: 'login',
  });

  const existingIdentity = await getIdentity('phone_sms', phone, '');
  if (existingIdentity) {
    await markIdentityLogin(existingIdentity.identityId);
    const user = toAuthUser(existingIdentity);
    return {
      token: signAuthToken(user),
      user,
    };
  }

  const createdUser = await withTransaction(async (executor) => {
    const user = await createUserRow(executor, {
      primaryPhone: phone,
    });

    await createIdentity(executor, {
      userPk: user.id,
      provider: 'phone_sms',
      providerUserId: phone,
      isVerified: true,
      isPrimary: true,
    });

    await setPrimaryPhone(executor, user.id, phone);
    return user;
  });

  const user = toAuthUser(createdUser);
  return {
    token: signAuthToken(user),
    user,
  };
}

export async function registerPhoneUser(input: { phone: string; code: string }) {
  const phone = normalizePhone(input.phone);
  const code = String(input.code || '').trim();
  if (!phone || !code) throw new HttpError(400, '手机号和验证码不能为空。');
  const existingIdentity = await getIdentity('phone_sms', phone, '');
  if (existingIdentity) throw new HttpError(409, '该手机号已注册，请直接登录。');
  await consumePhoneVerificationCode({ phone, code, purpose: 'register' });
  const createdUser = await withTransaction(async (executor) => {
    const user = await createUserRow(executor, { primaryPhone: phone });
    await createIdentity(executor, { userPk: user.id, provider: 'phone_sms', providerUserId: phone, isVerified: true, isPrimary: true });
    await setPrimaryPhone(executor, user.id, phone);
    return user;
  });
  const user = toAuthUser(createdUser);
  return { token: signAuthToken(user), user };
}
export async function sendPhoneBindCode(input: { phone: string }) {
  const phone = normalizePhone(input.phone);

  if (!phone) {
    throw new HttpError(400, '手机号不能为空。');
  }

  return createPhoneVerificationCode({
    phone,
    purpose: 'bind',
  });
}

export async function sendPhoneUnbindCode(input: { phone: string }) {
  const phone = normalizePhone(input.phone);

  if (!phone) {
    throw new HttpError(400, '手机号不能为空。');
  }

  return createPhoneVerificationCode({
    phone,
    purpose: 'unbind',
  });
}

export async function bindPhoneToUser(input: {
  userPk: string;
  phone: string;
  code: string;
}) {
  const user = await getUserById(input.userPk);
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const phone = normalizePhone(input.phone);
  const code = String(input.code || '').trim();

  if (!phone || !code) {
    throw new HttpError(400, '手机号和验证码不能为空。');
  }

  await consumePhoneVerificationCode({
    phone,
    code,
    purpose: 'bind',
  });

  const existingIdentity = await getIdentity('phone_sms', phone, '');
  if (existingIdentity && existingIdentity.user_pk !== input.userPk) {
    throw new HttpError(409, '该手机号已绑定其他账号。');
  }

  if (existingIdentity && existingIdentity.user_pk === input.userPk) {
    throw new HttpError(409, '当前账号已绑定该手机号。');
  }

  await withTransaction(async (executor) => {
    await createIdentity(executor, {
      userPk: input.userPk,
      provider: 'phone_sms',
      providerUserId: phone,
      isVerified: true,
      isPrimary: user.primary_phone ? false : true,
    });

    if (!user.primary_phone) {
      await setPrimaryPhone(executor, input.userPk, phone);
    }
  });

  return { ok: true };
}
