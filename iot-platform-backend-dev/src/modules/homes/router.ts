import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../../shared/auth';
import { asyncHandler } from '../../shared/http';
import {
  addHomeMember,
  createHome,
  deleteHome,
  listHomes,
  removeHomeMembers,
  updateHomeDeviceLinks,
} from './service';

export const homesRouter = Router();

homesRouter.use(requireAuth);

homesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const homes = await listHomes((req as AuthenticatedRequest).user!.uid);
    res.json({ homes });
  })
);

homesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const home = await createHome({
      ownerId: (req as AuthenticatedRequest).user!.uid,
      name: String(req.body?.name || ''),
    });

    res.status(201).json({ home });
  })
);

homesRouter.patch(
  '/:homeId/device-links',
  asyncHandler(async (req, res) => {
    const result = await updateHomeDeviceLinks({
      userId: (req as AuthenticatedRequest).user!.uid,
      homeId: req.params.homeId,
      deviceIds: req.body?.deviceIds,
    });

    res.json(result);
  })
);

homesRouter.post(
  '/:homeId/members',
  asyncHandler(async (req, res) => {
    const result = await addHomeMember({
      userId: (req as AuthenticatedRequest).user!.uid,
      homeId: req.params.homeId,
      targetUserId: String(req.body?.userId || ''),
    });

    res.json(result);
  })
);

homesRouter.delete(
  '/:homeId/members',
  asyncHandler(async (req, res) => {
    const result = await removeHomeMembers({
      userId: (req as AuthenticatedRequest).user!.uid,
      homeId: req.params.homeId,
      targetUserIds: req.body?.userIds,
    });

    res.json(result);
  })
);

homesRouter.delete(
  '/:homeId',
  asyncHandler(async (req, res) => {
    const result = await deleteHome({
      userId: (req as AuthenticatedRequest).user!.uid,
      homeId: req.params.homeId,
    });

    res.json(result);
  })
);