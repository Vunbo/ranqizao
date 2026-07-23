import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import {
  controlOpsDevice,
  getOpsDevice,
  getOpsDeviceAlerts,
  getOpsDeviceCommands,
  getOpsDeviceLiveProperties,
  getOpsDeviceRealtimeMetrics,
  getOpsDeviceRuntime,
  getOpsDeviceShadow,
  listOpsDevices,
  refreshOpsDeviceRuntime,
} from './service';

export const opsDevicesRouter = Router();

opsDevicesRouter.use(requireAdminAuth);

opsDevicesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOpsDevices(req.query || {});
    res.json(result);
  })
);

opsDevicesRouter.get(
  '/:deviceId',
  asyncHandler(async (req, res) => {
    const result = await getOpsDevice(req.params.deviceId);
    res.json(result);
  })
);

opsDevicesRouter.get(
  '/:deviceId/metrics/realtime',
  asyncHandler(async (req, res) => {
    const metrics = await getOpsDeviceRealtimeMetrics(req.params.deviceId);
    res.json({ metrics });
  })
);

opsDevicesRouter.get(
  '/:deviceId/runtime',
  asyncHandler(async (req, res) => {
    const runtime = await getOpsDeviceRuntime(req.params.deviceId);
    res.json({ runtime });
  })
);

opsDevicesRouter.post(
  '/:deviceId/runtime/refresh',
  asyncHandler(async (req, res) => {
    const result = await refreshOpsDeviceRuntime(req.params.deviceId);
    res.json(result);
  })
);

opsDevicesRouter.get(
  '/:deviceId/shadow',
  asyncHandler(async (req, res) => {
    const shadow = await getOpsDeviceShadow(req.params.deviceId);
    res.json({ shadow });
  })
);

opsDevicesRouter.get(
  '/:deviceId/properties/live',
  asyncHandler(async (req, res) => {
    const properties = await getOpsDeviceLiveProperties(req.params.deviceId);
    res.json({ properties });
  })
);

opsDevicesRouter.get(
  '/:deviceId/commands',
  asyncHandler(async (req, res) => {
    const items = await getOpsDeviceCommands(req.params.deviceId);
    res.json({ items });
  })
);

opsDevicesRouter.get(
  '/:deviceId/alerts',
  asyncHandler(async (req, res) => {
    const items = await getOpsDeviceAlerts(req.params.deviceId);
    res.json({ items });
  })
);

opsDevicesRouter.post(
  '/:deviceId/control',
  asyncHandler(async (req, res) => {
    const result = await controlOpsDevice({
      deviceId: req.params.deviceId,
      adminId: (req as import('../../../shared/admin-auth').AdminAuthenticatedRequest).admin!.adminId,
      adminName: (req as import('../../../shared/admin-auth').AdminAuthenticatedRequest).admin!.displayName,
      command: String(req.body?.command || ''),
      reason: String(req.body?.reason || ''),
    });
    res.json(result);
  })
);
