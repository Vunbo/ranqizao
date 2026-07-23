import { Router } from 'express';
import { asyncHandler } from '../../shared/http';
import { ingestHuaweiIotCallback } from './ingest-service';

export const iotRouter = Router();

iotRouter.post(
  '/huawei/callback',
  asyncHandler(async (req, res) => {
    const headerSecret = typeof req.headers['x-iot-callback-secret'] === 'string'
      ? req.headers['x-iot-callback-secret']
      : null;
    const querySecret = typeof req.query.secret === 'string'
      ? req.query.secret
      : null;
    const result = await ingestHuaweiIotCallback({
      payload: (req.body || {}) as Record<string, unknown>,
      secret: headerSecret || querySecret,
    });

    res.json({
      ok: true,
      result,
    });
  })
);
