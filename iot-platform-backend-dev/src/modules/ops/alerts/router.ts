import { Router } from 'express';
import { type AdminAuthenticatedRequest, requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import {
  listOpsAlerts,
  markOpsAlertFalsePositive,
  resolveOpsAlert,
} from './service';

export const opsAlertsRouter = Router();

opsAlertsRouter.use(requireAdminAuth);

opsAlertsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOpsAlerts(req.query || {});
    res.json(result);
  })
);

opsAlertsRouter.patch(
  '/:alertId/resolve',
  asyncHandler(async (req, res) => {
    const result = await resolveOpsAlert(
      req.params.alertId,
      (req as AdminAuthenticatedRequest).admin!,
      String(req.body?.comment || '')
    );
    res.json(result);
  })
);

opsAlertsRouter.patch(
  '/:alertId/false-positive',
  asyncHandler(async (req, res) => {
    const result = await markOpsAlertFalsePositive(
      req.params.alertId,
      (req as AdminAuthenticatedRequest).admin!,
      String(req.body?.comment || '')
    );
    res.json(result);
  })
);
