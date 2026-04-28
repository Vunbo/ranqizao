import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { getOpsUser, listOpsUsers } from './service';

export const opsUsersRouter = Router();

opsUsersRouter.use(requireAdminAuth);

opsUsersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOpsUsers(req.query || {});
    res.json(result);
  })
);

opsUsersRouter.get(
  '/:uid',
  asyncHandler(async (req, res) => {
    const result = await getOpsUser(req.params.uid);
    res.json(result);
  })
);
