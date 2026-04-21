import cors from 'cors';
import express from 'express';
import { env } from '../config/env';
import { query } from '../database/client';
import { authRouter } from '../modules/auth/router';
import { devicesRouter } from '../modules/devices/router';
import { homesRouter } from '../modules/homes/router';
import { asyncHandler, errorHandler } from '../shared/http';

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
  app.use(errorHandler);

  return app;
}
