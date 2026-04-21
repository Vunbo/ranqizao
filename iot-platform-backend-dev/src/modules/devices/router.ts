import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../../shared/auth';
import { asyncHandler } from '../../shared/http';
import {
  bindScannedDevice,
  createDevice,
  createDeviceLog,
  deleteDevice,
  listDeviceLogs,
  listDevices,
  removeDeviceShare,
  scanBindableDevice,
  shareDevice,
  updateDevice,
} from './service';

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

devicesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const devices = await listDevices((req as AuthenticatedRequest).user!.uid);
    res.json({ devices });
  })
);

devicesRouter.post(
  '/bind/scan',
  asyncHandler(async (req, res) => {
    const result = await scanBindableDevice({
      userId: (req as AuthenticatedRequest).user!.uid,
      qrCode: String(req.body?.qrCode || ''),
    });

    res.json(result);
  })
);

devicesRouter.post(
  '/bind',
  asyncHandler(async (req, res) => {
    const result = await bindScannedDevice({
      userId: (req as AuthenticatedRequest).user!.uid,
      qrCode: String(req.body?.qrCode || ''),
      name: String(req.body?.name || ''),
      location: req.body?.location,
      wifiSsid: req.body?.wifiSsid,
    });

    res.status(201).json(result);
  })
);

devicesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const device = await createDevice({
      ownerId: (req as AuthenticatedRequest).user!.uid,
      name: String(req.body?.name || ''),
      location: req.body?.location,
    });

    res.status(201).json({ device });
  })
);

devicesRouter.patch(
  '/:deviceId',
  asyncHandler(async (req, res) => {
    const device = await updateDevice({
      userId: (req as AuthenticatedRequest).user!.uid,
      deviceId: req.params.deviceId,
      body: (req.body || {}) as Record<string, unknown>,
    });

    res.json({ device });
  })
);

devicesRouter.delete(
  '/:deviceId',
  asyncHandler(async (req, res) => {
    const result = await deleteDevice({
      userId: (req as AuthenticatedRequest).user!.uid,
      deviceId: req.params.deviceId,
    });

    res.json(result);
  })
);

devicesRouter.get(
  '/:deviceId/logs',
  asyncHandler(async (req, res) => {
    const logs = await listDeviceLogs({
      userId: (req as AuthenticatedRequest).user!.uid,
      deviceId: req.params.deviceId,
    });

    res.json({ logs });
  })
);

devicesRouter.post(
  '/:deviceId/logs',
  asyncHandler(async (req, res) => {
    const log = await createDeviceLog({
      userId: (req as AuthenticatedRequest).user!.uid,
      deviceId: req.params.deviceId,
      event: String(req.body?.event || ''),
      type: String(req.body?.type || 'info'),
    });

    res.status(201).json({ log });
  })
);

devicesRouter.post(
  '/:deviceId/share',
  asyncHandler(async (req, res) => {
    const result = await shareDevice({
      userId: (req as AuthenticatedRequest).user!.uid,
      deviceId: req.params.deviceId,
      targetUserId: String(req.body?.userId || ''),
    });

    res.json(result);
  })
);

devicesRouter.delete(
  '/:deviceId/share/:userId',
  asyncHandler(async (req, res) => {
    const result = await removeDeviceShare({
      userId: (req as AuthenticatedRequest).user!.uid,
      deviceId: req.params.deviceId,
      targetUserId: req.params.userId,
    });

    res.json(result);
  })
);
