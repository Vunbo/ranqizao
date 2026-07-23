import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../../shared/auth';
import { asyncHandler } from '../../shared/http';
import {
  bindEmailToUser,
  bindGoogleAppToUser,
  bindWechatAppToUser,
  bindMiniProgramToUser,
  bindPhoneToUser,
  changePassword,
  getCurrentUser,
  loginGoogleAppUser,
  listUserIdentities,
  loginWechatAppUser,
  loginMiniProgramUser,
  loginPhoneUser,
  loginUser,
  registerUser,
  registerPhoneUser,
  sendPhoneBindCode,
  sendPhoneLoginCode,
  sendPhoneRegistrationCode,
  sendPhoneUnbindCode,
  unbindIdentity,
  updateCurrentUserProfile,
} from './service';

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const result = await registerUser({
      email: String(req.body?.email || ''),
      password: String(req.body?.password || ''),
      displayName: String(req.body?.displayName || ''),
    });

    res.status(201).json(result);
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await loginUser({
      email: String(req.body?.email || ''),
      password: String(req.body?.password || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/phone/send-code',
  asyncHandler(async (req, res) => {
    const result = await sendPhoneLoginCode({
      phone: String(req.body?.phone || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/phone/register/send-code',
  asyncHandler(async (req, res) => {
    const result = await sendPhoneRegistrationCode({ phone: String(req.body?.phone || '') });
    res.json(result);
  })
);

authRouter.post(
  '/phone/register',
  asyncHandler(async (req, res) => {
    const result = await registerPhoneUser({ phone: String(req.body?.phone || ''), code: String(req.body?.code || '') });
    res.status(201).json(result);
  })
);
authRouter.post(
  '/phone/login',
  asyncHandler(async (req, res) => {
    const result = await loginPhoneUser({
      phone: String(req.body?.phone || ''),
      code: String(req.body?.code || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/wechat/app/login',
  asyncHandler(async (req, res) => {
    const result = await loginWechatAppUser({
      code: String(req.body?.code || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/google/app/login',
  asyncHandler(async (req, res) => {
    const result = await loginGoogleAppUser({
      idToken: req.body?.idToken ? String(req.body.idToken) : '',
      accessToken: req.body?.accessToken ? String(req.body.accessToken) : '',
      authResult: req.body?.authResult,
      userInfo: req.body?.userInfo,
    });

    res.json(result);
  })
);

authRouter.post(
  '/mini-program/login',
  asyncHandler(async (req, res) => {
    const result = await loginMiniProgramUser({
      code: String(req.body?.code || ''),
    });

    res.json(result);
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser((req as AuthenticatedRequest).user!.userId);
    res.json({ user });
  })
);

authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await updateCurrentUserProfile({
      userPk: (req as AuthenticatedRequest).user!.userId,
      displayName: String(req.body?.displayName || ''),
    });
    res.json({ user });
  })
);

authRouter.get(
  '/identities',
  requireAuth,
  asyncHandler(async (req, res) => {
    const identities = await listUserIdentities(
      (req as AuthenticatedRequest).user!.userId
    );
    res.json({ identities });
  })
);

authRouter.post(
  '/password/change',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await changePassword({
      userPk: (req as AuthenticatedRequest).user!.userId,
      currentPassword: String(req.body?.currentPassword || ''),
      newPassword: String(req.body?.newPassword || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/unbind/phone/send-code',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await sendPhoneUnbindCode({
      phone: String(req.body?.phone || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/unbind',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await unbindIdentity({
      userPk: (req as AuthenticatedRequest).user!.userId,
      provider: String(req.body?.provider || '') as any,
      providerUserId: String(req.body?.providerUserId || ''),
      providerAppId: String(req.body?.providerAppId || ''),
      verificationType: String(req.body?.verificationType || '') as any,
      currentPassword: req.body?.currentPassword
        ? String(req.body.currentPassword)
        : '',
      phone: req.body?.phone ? String(req.body.phone) : '',
      code: req.body?.code ? String(req.body.code) : '',
      idToken: req.body?.idToken ? String(req.body.idToken) : '',
      accessToken: req.body?.accessToken ? String(req.body.accessToken) : '',
      authResult: req.body?.authResult,
      userInfo: req.body?.userInfo,
    });

    res.json(result);
  })
);

authRouter.post(
  '/bind/email',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await bindEmailToUser({
      userPk: (req as AuthenticatedRequest).user!.userId,
      email: String(req.body?.email || ''),
      password: String(req.body?.password || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/bind/phone/send-code',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await sendPhoneBindCode({
      phone: String(req.body?.phone || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/bind/phone',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await bindPhoneToUser({
      userPk: (req as AuthenticatedRequest).user!.userId,
      phone: String(req.body?.phone || ''),
      code: String(req.body?.code || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/bind/wechat/app',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await bindWechatAppToUser({
      userPk: (req as AuthenticatedRequest).user!.userId,
      code: String(req.body?.code || ''),
    });

    res.json(result);
  })
);

authRouter.post(
  '/bind/google/app',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await bindGoogleAppToUser({
      userPk: (req as AuthenticatedRequest).user!.userId,
      idToken: req.body?.idToken ? String(req.body.idToken) : '',
      accessToken: req.body?.accessToken ? String(req.body.accessToken) : '',
      authResult: req.body?.authResult,
      userInfo: req.body?.userInfo,
    });

    res.json(result);
  })
);

authRouter.post(
  '/bind/mini-program',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await bindMiniProgramToUser({
      userPk: (req as AuthenticatedRequest).user!.userId,
      code: String(req.body?.code || ''),
    });

    res.json(result);
  })
);

authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});
