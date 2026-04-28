import { Router } from 'express';
import { type AdminAuthenticatedRequest, requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import {
  createOpsConfigItem,
  deleteOpsConfigItem,
  listOpsConfigItems,
  simulateOpsConfig,
  updateOpsConfigItem,
} from './service';

export const opsConfigsRouter = Router();

opsConfigsRouter.use(requireAdminAuth);

opsConfigsRouter.get(
  '/templates',
  asyncHandler(async (_req, res) => {
    const items = await listOpsConfigItems('templates');
    res.json({ items });
  })
);

opsConfigsRouter.post(
  '/templates',
  asyncHandler(async (req, res) => {
    const result = await createOpsConfigItem(
      'templates',
      (req.body || {}) as Record<string, unknown>,
      (req as AdminAuthenticatedRequest).admin!
    );
    res.status(201).json(result);
  })
);

opsConfigsRouter.put(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    const result = await updateOpsConfigItem(
      'templates',
      req.params.id,
      (req.body || {}) as Record<string, unknown>,
      (req as AdminAuthenticatedRequest).admin!
    );
    res.json(result);
  })
);

opsConfigsRouter.delete(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    const result = await deleteOpsConfigItem('templates', req.params.id);
    res.json(result);
  })
);

opsConfigsRouter.get(
  '/alert-rules',
  asyncHandler(async (_req, res) => {
    const items = await listOpsConfigItems('alert-rules');
    res.json({ items });
  })
);

opsConfigsRouter.post(
  '/alert-rules',
  asyncHandler(async (req, res) => {
    const result = await createOpsConfigItem(
      'alert-rules',
      (req.body || {}) as Record<string, unknown>,
      (req as AdminAuthenticatedRequest).admin!
    );
    res.status(201).json(result);
  })
);

opsConfigsRouter.put(
  '/alert-rules/:id',
  asyncHandler(async (req, res) => {
    const result = await updateOpsConfigItem(
      'alert-rules',
      req.params.id,
      (req.body || {}) as Record<string, unknown>,
      (req as AdminAuthenticatedRequest).admin!
    );
    res.json(result);
  })
);

opsConfigsRouter.delete(
  '/alert-rules/:id',
  asyncHandler(async (req, res) => {
    const result = await deleteOpsConfigItem('alert-rules', req.params.id);
    res.json(result);
  })
);

opsConfigsRouter.get(
  '/risk-rules',
  asyncHandler(async (_req, res) => {
    const items = await listOpsConfigItems('risk-rules');
    res.json({ items });
  })
);

opsConfigsRouter.post(
  '/risk-rules',
  asyncHandler(async (req, res) => {
    const result = await createOpsConfigItem(
      'risk-rules',
      (req.body || {}) as Record<string, unknown>,
      (req as AdminAuthenticatedRequest).admin!
    );
    res.status(201).json(result);
  })
);

opsConfigsRouter.put(
  '/risk-rules/:id',
  asyncHandler(async (req, res) => {
    const result = await updateOpsConfigItem(
      'risk-rules',
      req.params.id,
      (req.body || {}) as Record<string, unknown>,
      (req as AdminAuthenticatedRequest).admin!
    );
    res.json(result);
  })
);

opsConfigsRouter.delete(
  '/risk-rules/:id',
  asyncHandler(async (req, res) => {
    const result = await deleteOpsConfigItem('risk-rules', req.params.id);
    res.json(result);
  })
);

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
