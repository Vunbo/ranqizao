import { networkInterfaces } from 'os';
import type { Server } from 'http';
import { env } from '../config/env';
import { bootstrapDatabase } from '../database/bootstrap';
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

export async function startServer(): Promise<Server> {
  await bootstrapDatabase();

  const app = createApp();
  return app.listen(env.port, env.host, () => {
    const urls = collectAccessibleUrls();
    console.log(`API server is running on ${env.host}:${env.port}`);
    urls.forEach((url) => {
      console.log(`Accessible URL: ${url}`);
    });
  });
}
