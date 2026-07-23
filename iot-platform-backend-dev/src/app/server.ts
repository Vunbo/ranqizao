import { networkInterfaces } from 'os';
import type { Server } from 'http';
import { env } from '../config/env';
import { getIotConfigDiagnostics, iotEnv } from '../config/iot';
import { bootstrapDatabase } from '../db/bootstrap';
import { createApp } from './createApp';

function collectAccessibleUrls() {
  if (env.host !== '0.0.0.0') {
    return [`http://${env.host}:${env.port}`];
  }

  const urls = new Set<string>([`http://127.0.0.1:${env.port}`]);
  const interfaces = networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        urls.add(`http://${entry.address}:${env.port}`);
      }
    }
  }

  return Array.from(urls);
}

function reportIotConfigDiagnostics() {
  const diagnostics = getIotConfigDiagnostics();

  if (!diagnostics.enabled) {
    console.log('Huawei IoTDA integration is disabled.');
    return;
  }

  if (diagnostics.errors.length > 0) {
    throw new Error(
      [
        'Huawei IoTDA configuration is invalid:',
        ...diagnostics.errors.map((item) => `- ${item}`),
      ].join('\n')
    );
  }

  console.log(`Huawei IoTDA integration is enabled. Endpoint: ${iotEnv.endpoint}`);

  diagnostics.warnings.forEach((warning) => {
    console.warn(`Huawei IoTDA config warning: ${warning}`);
  });
}

export async function startServer(): Promise<Server> {
  await bootstrapDatabase();
  reportIotConfigDiagnostics();

  const app = createApp();
  return app.listen(env.port, env.host, () => {
    const urls = collectAccessibleUrls();
    console.log(`API server is running on ${env.host}:${env.port}`);
    urls.forEach((url) => {
      console.log(`Accessible URL: ${url}`);
    });
  });
}
