import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { withTransaction } from '../../db/client';
import { signAuthToken } from '../../shared/auth';
import { HttpError } from '../../shared/http';
import {
  asRecord,
  normalizeEmail,
  readCandidateString,
  toAuthUser,
} from './auth.helpers';
import {
  createIdentity,
  createUserRow,
  getIdentity,
  getUserByEmail,
  getUserById,
  getWechatIdentityByUnionId,
  markIdentityLogin,
  setPrimaryEmail,
} from './auth.repository';
import type {
  GoogleUserInfoResponse,
  GoogleVerifiedProfile,
  WechatAppAccessTokenResponse,
  WechatAppUserInfoResponse,
  WechatCode2SessionResponse,
} from './auth.types';

const googleIdClient = new OAuth2Client();

export function getGoogleProviderAppId() {
  return env.googleApp.webClientId || 'google_app';
}

export function getWechatMiniProgramProviderAppId() {
  return env.wechatMiniProgram.appId;
}

export function getWechatAppProviderAppId() {
  return env.wechatApp.appId;
}

export async function exchangeMiniProgramCode(code: string) {
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

export async function exchangeWechatAppCode(code: string) {
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

export async function resolveGoogleAppProfile(input: {
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
    await markIdentityLogin(exactIdentity.identityId);
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
    await markIdentityLogin(exactIdentity.identityId);
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
