import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { getOpsDashboardMap, getOpsDashboardSummary } from './service';

export const opsDashboardRouter = Router();

opsDashboardRouter.use(requireAdminAuth);

opsDashboardRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const summary = await getOpsDashboardSummary();
    res.json({ summary });
  })
);

opsDashboardRouter.get(
  '/map',
  asyncHandler(async (req, res) => {
    const result = await getOpsDashboardMap(req.query || {});
    res.json(result);
  })
);
