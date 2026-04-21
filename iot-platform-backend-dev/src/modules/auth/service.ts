import { randomBytes, randomInt, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { query, withTransaction, type DatabaseExecutor } from '../../database/client';
import { signAuthToken, type AuthUser } from '../../shared/auth';
import { HttpError } from '../../shared/http';

type IdentityProvider =
  | 'email_password'
  | 'phone_sms'
  | 'wechat_app'
  | 'wechat_mini_program'
  | 'google_app';

interface UserRow {
  id: string;
  short_uid: string;
  primary_email: string | null;
  primary_phone: string | null;
  display_name: string;
  photo_url: string | null;
  status: string;
}

interface AuthIdentityRow {
  id: string;
  user_pk: string;
  provider: IdentityProvider;
  provider_user_id: string;
  provider_app_id: string;
  union_id: string | null;
  password_hash: string | null;
  is_verified: boolean;
  is_primary: boolean;
  meta: Record<string, unknown> | null;
}

interface VerificationCodeRow {
  id: string;
  targetType: 'phone';
  targetValue: string;
  purpose: 'login' | 'bind' | 'unbind';
  codeHash: string;
  expiresAt: string;
  usedAt: string | null;
}

interface WechatCode2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatAppAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  scope?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatAppUserInfoResponse {
  openid?: string;
  nickname?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface GoogleUserInfoResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

interface GoogleVerifiedProfile {
  providerUserId: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  meta: Record<string, unknown>;
}

const googleIdClient = new OAuth2Client();

function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value: string) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readCandidateString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized) {
        return normalized;
      }
    }
  }

  return '';
}

function getGoogleProviderAppId() {
  return env.googleApp.webClientId || 'google_app';
}

function createShortUid() {
  return randomBytes(4).toString('hex');
}

function createPhoneCode() {
  return String(randomInt(100000, 1000000));
}

function toAuthUser(user: UserRow): AuthUser {
  return {
    userId: user.id,
    uid: user.short_uid,
    email: user.primary_email || '',
    displayName: user.display_name,
    photoURL: user.photo_url,
  };
}

async function createUserRow(
  executor: DatabaseExecutor,
  input: {
    displayName?: string;
    primaryEmail?: string | null;
    primaryPhone?: string | null;
    photoURL?: string | null;
    legacyEmail?: string | null;
    legacyPasswordHash?: string | null;
  }
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

async function getUserById(userPk: string) {
  const result = await query<UserRow>(
    `
      SELECT
        id,
        short_uid,
        primary_email,
        primary_phone,
        display_name,
        photo_url,
        status
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userPk]
  );

  return result.rows[0] || null;
}

async function getUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const result = await query<UserRow>(
    `
      SELECT
        id,
        short_uid,
        primary_email,
        primary_phone,
        display_name,
        photo_url,
        status
      FROM users
      WHERE primary_email = $1
         OR email = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return result.rows[0] || null;
}

async function getIdentity(
  provider: IdentityProvider,
  providerUserId: string,
  providerAppId = ''
) {
  const result = await query<(AuthIdentityRow & UserRow)>(
    `
      SELECT
        ai.id,
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
      WHERE ai.provider = $1
        AND ai.provider_user_id = $2
        AND ai.provider_app_id = $3
      LIMIT 1
    `,
    [provider, providerUserId, providerAppId]
  );

  return result.rows[0] || null;
}

async function getWechatIdentityByUnionId(unionId: string) {
  const result = await query<(AuthIdentityRow & UserRow)>(
    `
      SELECT
        ai.id,
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
      WHERE ai.union_id = $1
        AND ai.provider IN ('wechat_app', 'wechat_mini_program')
      ORDER BY ai.created_at ASC
      LIMIT 1
    `,
    [unionId]
  );

  return result.rows[0] || null;
}

async function createIdentity(
  executor: DatabaseExecutor,
  input: {
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

async function setPrimaryEmail(
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

async function setPrimaryPhone(
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

async function markIdentityLogin(identityId: string) {
  await query(
    'UPDATE auth_identities SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
    [identityId]
  );
}

async function exchangeMiniProgramCode(code: string) {
  const normalizedCode = String(code || '').trim();

  if (!normalizedCode) {
    throw new HttpError(400, '微信登录凭证不能为空。');
  }

  if (!env.wechatMiniProgram.appId || !env.wechatMiniProgram.appSecret) {
    throw new HttpError(503, '后端未配置微信小程序登录能力。');
  }

  const searchParams = new URLSearchParams({
    appid: env.wechatMiniProgram.appId,
    secret: env.wechatMiniProgram.appSecret,
    js_code: normalizedCode,
    grant_type: 'authorization_code',
  });

  const response = await fetch(
    `https://api.weixin.qq.com/sns/jscode2session?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new HttpError(502, '微信登录服务暂时不可用。');
  }

  const payload = (await response.json()) as WechatCode2SessionResponse;

  if (payload.errcode || !payload.openid) {
    throw new HttpError(
      401,
      payload.errmsg || '微信登录失败，请重新获取登录凭证。'
    );
  }

  return {
    openid: payload.openid,
    unionid: payload.unionid || null,
  };
}

async function exchangeWechatAppCode(code: string) {
  const normalizedCode = String(code || '').trim();

  if (!normalizedCode) {
    throw new HttpError(400, '微信 App 登录凭证不能为空。');
  }

  if (!env.wechatApp.appId || !env.wechatApp.appSecret) {
    throw new HttpError(503, '后端未配置 App 微信登录能力。');
  }

  const searchParams = new URLSearchParams({
    appid: env.wechatApp.appId,
    secret: env.wechatApp.appSecret,
    code: normalizedCode,
    grant_type: 'authorization_code',
  });

  const response = await fetch(
    `https://api.weixin.qq.com/sns/oauth2/access_token?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new HttpError(502, '微信 App 登录服务暂时不可用。');
  }

  const payload = (await response.json()) as WechatAppAccessTokenResponse;

  if (payload.errcode || !payload.openid || !payload.access_token) {
    throw new HttpError(
      401,
      payload.errmsg || '微信 App 登录失败，请重新获取登录凭证。'
    );
  }

  let nickname = '';
  let unionid = payload.unionid || null;

  try {
    const userInfoSearchParams = new URLSearchParams({
      access_token: payload.access_token,
      openid: payload.openid,
      lang: 'zh_CN',
    });
    const userInfoResponse = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?${userInfoSearchParams.toString()}`
    );
    if (userInfoResponse.ok) {
      const userInfo = (await userInfoResponse.json()) as WechatAppUserInfoResponse;
      if (!userInfo.errcode) {
        nickname = String(userInfo.nickname || '').trim();
        if (!unionid) {
          unionid = userInfo.unionid || null;
        }
      }
    }
  } catch (_error) {
    // ignore user info fetch failures and fall back to openid-based display name
  }

  return {
    openid: payload.openid,
    unionid,
    nickname,
  };
}

async function verifyGoogleIdToken(idToken: string) {
  const normalizedIdToken = String(idToken || '').trim();

  if (!normalizedIdToken) {
    throw new HttpError(400, 'Google 身份令牌不能为空。');
  }

  if (!env.googleApp.webClientId) {
    throw new HttpError(503, '后端未配置 App Google 登录校验能力。');
  }

  const ticket = await googleIdClient.verifyIdToken({
    idToken: normalizedIdToken,
    audience: env.googleApp.webClientId,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub) {
    throw new HttpError(401, 'Google 身份令牌无效。');
  }

  return {
    providerUserId: payload.sub,
    email: payload.email ? normalizeEmail(payload.email) : null,
    displayName: String(payload.name || '').trim(),
    photoURL: payload.picture || null,
  };
}

async function fetchGoogleUserInfo(accessToken: string) {
  const normalizedAccessToken = String(accessToken || '').trim();

  if (!normalizedAccessToken) {
    throw new HttpError(400, 'Google 访问令牌不能为空。');
  }

  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${normalizedAccessToken}`,
    },
  });

  if (!response.ok) {
    throw new HttpError(401, 'Google 登录凭证无效或已过期。');
  }

  const payload = (await response.json()) as GoogleUserInfoResponse;

  if (!payload.sub) {
    throw new HttpError(401, 'Google 用户信息获取失败。');
  }

  return {
    providerUserId: payload.sub,
    email: payload.email ? normalizeEmail(payload.email) : null,
    displayName: String(payload.name || '').trim(),
    photoURL: payload.picture || null,
  };
}

async function resolveGoogleAppProfile(input: {
  idToken?: string;
  accessToken?: string;
  authResult?: unknown;
  userInfo?: unknown;
}) {
  const authResult = asRecord(input.authResult) || {};
  const userInfo = asRecord(input.userInfo) || {};
  const authInfo = asRecord(userInfo.authResult) || {};
  const accountInfo = asRecord(userInfo.userInfo) || {};

  const idToken = readCandidateString(
    input.idToken,
    authResult.id_token,
    authResult.idToken,
    authInfo.id_token,
    authInfo.idToken
  );
  const accessToken = readCandidateString(
    input.accessToken,
    authResult.access_token,
    authResult.accessToken,
    authResult.token,
    authInfo.access_token,
    authInfo.accessToken
  );

  let verifiedProfile: {
    providerUserId: string;
    email: string | null;
    displayName: string;
    photoURL: string | null;
  };

  if (idToken && env.googleApp.webClientId) {
    verifiedProfile = await verifyGoogleIdToken(idToken);
  } else if (accessToken) {
    verifiedProfile = await fetchGoogleUserInfo(accessToken);
  } else if (idToken) {
    verifiedProfile = await verifyGoogleIdToken(idToken);
  } else {
    throw new HttpError(400, 'Google 登录未返回可校验的身份凭证。');
  }

  const displayName =
    verifiedProfile.displayName ||
    readCandidateString(
      userInfo.displayName,
      accountInfo.displayName,
      userInfo.name,
      accountInfo.name,
      authResult.displayName,
      authInfo.displayName
    );
  const photoURL =
    verifiedProfile.photoURL ||
    readCandidateString(
      userInfo.avatarUrl,
      userInfo.imageUrl,
      accountInfo.avatarUrl,
      accountInfo.imageUrl,
      accountInfo.photoUrl,
      accountInfo.picture
    ) ||
    null;

  return {
    providerUserId: verifiedProfile.providerUserId,
    email: verifiedProfile.email,
    displayName,
    photoURL,
    meta: {
      authResult,
      userInfo,
      accessTokenPresent: Boolean(accessToken),
      idTokenPresent: Boolean(idToken),
    },
  } satisfies GoogleVerifiedProfile;
}

async function upsertWechatIdentityLogin(input: {
  provider: 'wechat_mini_program' | 'wechat_app';
  providerUserId: string;
  providerAppId: string;
  unionId: string | null;
}) {
  const exactIdentity = await getIdentity(
    input.provider,
    input.providerUserId,
    input.providerAppId
  );

  if (exactIdentity) {
    await markIdentityLogin(exactIdentity.id);
    return toAuthUser(exactIdentity);
  }

  if (input.unionId) {
    const unionIdentity = await getWechatIdentityByUnionId(input.unionId);
    if (unionIdentity) {
      await withTransaction(async (executor) => {
        await createIdentity(executor, {
          userPk: unionIdentity.user_pk,
          provider: input.provider,
          providerUserId: input.providerUserId,
          providerAppId: input.providerAppId,
          unionId: input.unionId,
          isVerified: true,
          isPrimary: false,
          meta: {
            openid: input.providerUserId,
            unionid: input.unionId,
          },
        });
      });

      const mergedUser = await getUserById(unionIdentity.user_pk);
      if (!mergedUser) {
        throw new HttpError(404, '用户不存在。');
      }
      return toAuthUser(mergedUser);
    }
  }

  const createdUser = await withTransaction(async (executor) => {
    const user = await createUserRow(executor, {});

    await createIdentity(executor, {
      userPk: user.id,
      provider: input.provider,
      providerUserId: input.providerUserId,
      providerAppId: input.providerAppId,
      unionId: input.unionId,
      isVerified: true,
      isPrimary: true,
      meta: {
        openid: input.providerUserId,
        unionid: input.unionId,
      },
    });

    return user;
  });

  return toAuthUser(createdUser);
}

async function upsertGoogleAppIdentityLogin(input: {
  idToken?: string;
  accessToken?: string;
  authResult?: unknown;
  userInfo?: unknown;
}) {
  const googleProfile = await resolveGoogleAppProfile(input);
  const providerAppId = getGoogleProviderAppId();

  const exactIdentity = await getIdentity(
    'google_app',
    googleProfile.providerUserId,
    providerAppId
  );

  if (exactIdentity) {
    await markIdentityLogin(exactIdentity.id);
    return toAuthUser(exactIdentity);
  }

  if (googleProfile.email) {
    const matchedUser = await getUserByEmail(googleProfile.email);
    if (matchedUser) {
      await withTransaction(async (executor) => {
        await createIdentity(executor, {
          userPk: matchedUser.id,
          provider: 'google_app',
          providerUserId: googleProfile.providerUserId,
          providerAppId,
          isVerified: true,
          isPrimary: false,
          meta: googleProfile.meta,
        });

        if (!matchedUser.primary_email) {
          await setPrimaryEmail(executor, matchedUser.id, googleProfile.email);
        }
      });

      const mergedUser = await getUserById(matchedUser.id);
      if (!mergedUser) {
        throw new HttpError(404, '用户不存在。');
      }

      return toAuthUser(mergedUser);
    }
  }

  const createdUser = await withTransaction(async (executor) => {
    const user = await createUserRow(executor, {
      primaryEmail: googleProfile.email,
      legacyEmail: googleProfile.email,
      photoURL: googleProfile.photoURL,
    });

    await createIdentity(executor, {
      userPk: user.id,
      provider: 'google_app',
      providerUserId: googleProfile.providerUserId,
      providerAppId,
      isVerified: true,
      isPrimary: true,
      meta: googleProfile.meta,
    });

    return user;
  });

  return toAuthUser(createdUser);
}

async function createPhoneVerificationCode(input: {
  phone: string;
  purpose: 'login' | 'bind' | 'unbind';
}) {
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

  if (!env.isProduction) {
    console.log(`[DEV] phone verification code for ${input.phone}: ${code}`);
  }

  return {
    ok: true,
    expiresIn: 300,
    debugCode: env.isProduction ? undefined : code,
  };
}

async function consumePhoneVerificationCode(input: {
  phone: string;
  code: string;
  purpose: 'login' | 'bind' | 'unbind';
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

  await markIdentityLogin(identity.id);
  const user = toAuthUser(identity);
  return {
    token: signAuthToken(user),
    user,
  };
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
    await markIdentityLogin(existingIdentity.id);
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

export async function loginMiniProgramUser(input: { code: string }) {
  const session = await exchangeMiniProgramCode(input.code);
  const user = await upsertWechatIdentityLogin({
    provider: 'wechat_mini_program',
    providerUserId: session.openid,
    providerAppId: env.wechatMiniProgram.appId,
    unionId: session.unionid,
  });

  return {
    token: signAuthToken(user),
    user,
  };
}

export async function loginWechatAppUser(input: { code: string }) {
  const session = await exchangeWechatAppCode(input.code);

  const user = await upsertWechatIdentityLogin({
    provider: 'wechat_app',
    providerUserId: session.openid,
    providerAppId: env.wechatApp.appId,
    unionId: session.unionid,
  });

  return {
    token: signAuthToken(user),
    user,
  };
}

export async function loginGoogleAppUser(input: {
  idToken?: string;
  accessToken?: string;
  authResult?: unknown;
  userInfo?: unknown;
}) {
  const user = await upsertGoogleAppIdentityLogin(input);

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

export async function bindMiniProgramToUser(input: {
  userPk: string;
  code: string;
}) {
  const user = await getUserById(input.userPk);
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const session = await exchangeMiniProgramCode(input.code);
  const exactIdentity = await getIdentity(
    'wechat_mini_program',
    session.openid,
    env.wechatMiniProgram.appId
  );

  if (exactIdentity && exactIdentity.user_pk !== input.userPk) {
    throw new HttpError(409, '该微信账号已绑定其他用户。');
  }

  if (exactIdentity && exactIdentity.user_pk === input.userPk) {
    throw new HttpError(409, '当前账号已绑定该微信。');
  }

  if (session.unionid) {
    const unionIdentity = await getWechatIdentityByUnionId(session.unionid);
    if (unionIdentity && unionIdentity.user_pk !== input.userPk) {
      throw new HttpError(409, '该微信身份已绑定其他用户。');
    }
  }

  await withTransaction(async (executor) => {
    await createIdentity(executor, {
      userPk: input.userPk,
      provider: 'wechat_mini_program',
      providerUserId: session.openid,
      providerAppId: env.wechatMiniProgram.appId,
      unionId: session.unionid,
      isVerified: true,
      isPrimary: false,
      meta: {
        openid: session.openid,
        unionid: session.unionid,
      },
    });
  });

  return { ok: true };
}

export async function bindWechatAppToUser(input: {
  userPk: string;
  code: string;
}) {
  const user = await getUserById(input.userPk);
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const session = await exchangeWechatAppCode(input.code);

  const exactIdentity = await getIdentity(
    'wechat_app',
    session.openid,
    env.wechatApp.appId
  );

  if (exactIdentity && exactIdentity.user_pk !== input.userPk) {
    throw new HttpError(409, '该微信账号已绑定其他用户。');
  }

  if (exactIdentity && exactIdentity.user_pk === input.userPk) {
    throw new HttpError(409, '当前账号已绑定该微信。');
  }

  if (session.unionid) {
    const unionIdentity = await getWechatIdentityByUnionId(session.unionid);
    if (unionIdentity && unionIdentity.user_pk !== input.userPk) {
      throw new HttpError(409, '该微信身份已绑定其他用户。');
    }
  }

  await withTransaction(async (executor) => {
    await createIdentity(executor, {
      userPk: input.userPk,
      provider: 'wechat_app',
      providerUserId: session.openid,
      providerAppId: env.wechatApp.appId,
      unionId: session.unionid,
      isVerified: true,
      isPrimary: false,
      meta: {
        openid: session.openid,
        unionid: session.unionid,
      },
    });
  });

  return { ok: true };
}

export async function bindGoogleAppToUser(input: {
  userPk: string;
  idToken?: string;
  accessToken?: string;
  authResult?: unknown;
  userInfo?: unknown;
}) {
  const user = await getUserById(input.userPk);
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const googleProfile = await resolveGoogleAppProfile(input);
  const providerAppId = getGoogleProviderAppId();
  const exactIdentity = await getIdentity(
    'google_app',
    googleProfile.providerUserId,
    providerAppId
  );

  if (exactIdentity && exactIdentity.user_pk !== input.userPk) {
    throw new HttpError(409, '该 Google 账号已绑定其他用户。');
  }

  if (exactIdentity && exactIdentity.user_pk === input.userPk) {
    throw new HttpError(409, '当前账号已绑定该 Google 账号。');
  }

  await withTransaction(async (executor) => {
    await createIdentity(executor, {
      userPk: input.userPk,
      provider: 'google_app',
      providerUserId: googleProfile.providerUserId,
      providerAppId,
      isVerified: true,
      isPrimary: false,
      meta: googleProfile.meta,
    });

    if (!user.primary_email && googleProfile.email) {
      await setPrimaryEmail(executor, input.userPk, googleProfile.email);
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
      env.wechatMiniProgram.appId
    );

    if (!miniIdentity || miniIdentity.user_pk !== input.userPk) {
      throw new HttpError(400, '微信小程序二次校验失败。');
    }
  } else if (input.verificationType === 'wechat_app') {
    const session = await exchangeWechatAppCode(String(input.code || ''));
    const appIdentity = await getIdentity(
      'wechat_app',
      session.openid,
      env.wechatApp.appId
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
