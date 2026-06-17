import { Router } from 'express';
import { type AdminAuthenticatedRequest, requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import {
  createOpsConfigItem,
  deleteOpsConfigItem,
  listOpsConfigItems,
  simulateOpsConfig,
  updateOpsConfigItem,
  type ConfigKind,
} from './service';

export const opsConfigsRouter = Router();

opsConfigsRouter.use(requireAdminAuth);

function registerConfigRoutes(router: Router, kind: ConfigKind) {
  router.get(
    `/${kind}`,
    asyncHandler(async (_req, res) => {
      const items = await listOpsConfigItems(kind);
      res.json({ items });
    })
  );

  router.post(
    `/${kind}`,
    asyncHandler(async (req, res) => {
      const result = await createOpsConfigItem(
        kind,
        (req.body || {}) as Record<string, unknown>,
        (req as AdminAuthenticatedRequest).admin!
      );
      res.status(201).json(result);
    })
  );

  router.put(
    `/${kind}/:id`,
    asyncHandler(async (req, res) => {
      const result = await updateOpsConfigItem(
        kind,
        req.params.id,
        (req.body || {}) as Record<string, unknown>,
        (req as AdminAuthenticatedRequest).admin!
      );
      res.json(result);
    })
  );

  router.delete(
    `/${kind}/:id`,
    asyncHandler(async (req, res) => {
      const result = await deleteOpsConfigItem(kind, req.params.id);
      res.json(result);
    })
  );
}

registerConfigRoutes(opsConfigsRouter, 'templates');
registerConfigRoutes(opsConfigsRouter, 'alert-rules');
registerConfigRoutes(opsConfigsRouter, 'risk-rules');

opsConfigsRouter.post(
  '/simulate',
  asyncHandler(async (req, res) => {
    const result = await simulateOpsConfig({
      type: String(req.body?.type || '') as 'message' | 'alert' | 'risk',
      configId: String(req.body?.configId || ''),
      target: String(req.body?.target || ''),
    });
    res.json(result);
  })
);
