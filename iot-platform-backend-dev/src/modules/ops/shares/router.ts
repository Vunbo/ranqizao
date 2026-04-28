import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { listOpsShares } from './service';

export const opsSharesRouter = Router();

opsSharesRouter.use(requireAdminAuth);

opsSharesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOpsShares(req.query || {});
    res.json(result);
  })
);
