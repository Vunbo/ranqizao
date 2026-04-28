import { Router } from 'express';
import { type AdminAuthenticatedRequest, requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { getCurrentAdmin, loginAdmin } from './service';

export const opsAuthRouter = Router();

opsAuthRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await loginAdmin({
      username: String(req.body?.username || ''),
      password: String(req.body?.password || ''),
    });

    res.json(result);
  })
);

opsAuthRouter.get(
  '/me',
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const user = await getCurrentAdmin(
      (req as AdminAuthenticatedRequest).admin!.adminId
    );
    res.json({ user });
  })
);

opsAuthRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});
