import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { getOpsCommand, listOpsCommands } from './service';

export const opsCommandsRouter = Router();

opsCommandsRouter.use(requireAdminAuth);

opsCommandsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOpsCommands(req.query || {});
    res.json(result);
  })
);

opsCommandsRouter.get(
  '/:commandId',
  asyncHandler(async (req, res) => {
    const item = await getOpsCommand(req.params.commandId);
    res.json({ item });
  })
);
