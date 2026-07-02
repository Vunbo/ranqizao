import cors from 'cors';
import express from 'express';
import { env } from '../config/env';
import { query } from '../db/client';
import { authRouter } from '../modules/auth/router';
import { devicesRouter } from '../modules/devices/router';
import { homesRouter } from '../modules/homes/router';
import { merchantRouter } from '../modules/merchant/router';
import { opsAuthRouter } from '../modules/ops/auth/router';
import { opsAlertsRouter } from '../modules/ops/alerts/router';
import { opsCommandsRouter } from '../modules/ops/commands/router';
import { opsConfigsRouter } from '../modules/ops/configs/router';
import { opsDashboardRouter } from '../modules/ops/dashboard/router';
import { opsDevicesRouter } from '../modules/ops/devices/router';
import { opsMerchantRouter } from '../modules/ops/merchant/router';
import { opsSharesRouter } from '../modules/ops/shares/router';
import { opsUsersRouter } from '../modules/ops/users/router';
import { asyncHandler, errorHandler } from '../shared/http';

function isLocalDevOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (env.corsAllowAll || !origin) {
          callback(null, true);
          return;
        }

        if (env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        if (!env.isProduction && isLocalDevOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin is not allowed: ${origin}`));
      },
    })
  );
  app.use(express.json());

  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      const result = await query<{ now: string }>('SELECT NOW()::TEXT AS now');
      res.json({
        ok: true,
        database: env.databaseName,
        time: result.rows[0]?.now,
      });
    })
  );

  app.use('/api/auth', authRouter);
  app.use('/api/devices', devicesRouter);
  app.use('/api/homes', homesRouter);
  app.use('/api/merchant', merchantRouter);

  app.use('/api/ops/auth', opsAuthRouter);
  app.use('/api/ops/dashboard', opsDashboardRouter);
  app.use('/api/ops/devices', opsDevicesRouter);
  app.use('/api/ops/users', opsUsersRouter);
  app.use('/api/ops/shares', opsSharesRouter);
  app.use('/api/ops/alerts', opsAlertsRouter);
  app.use('/api/ops/commands', opsCommandsRouter);
  app.use('/api/ops/configs', opsConfigsRouter);
  app.use('/api/ops/merchant', opsMerchantRouter);

  app.use(errorHandler);

  return app;
}
