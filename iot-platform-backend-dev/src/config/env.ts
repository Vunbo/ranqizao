import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

function resolveProjectRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '../..');
}

function loadEnvFile() {
  const projectRoot = resolveProjectRoot();
  const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
  const envFilePath = path.join(projectRoot, `.env.${nodeEnv}`);

  if (fs.existsSync(envFilePath)) {
    dotenv.config({
      path: envFilePath,
      override: false,
    });
  }

  return process.env.NODE_ENV?.trim() || nodeEnv;
}

function readString(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function readNumber(name: string, fallback: number) {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }

  return parsed;
}

function readCsv(value: string | undefined, fallback: string[]) {
  const source = value?.trim();
  if (!source) {
    return fallback;
  }

  return source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = loadEnvFile();
const rawCorsOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '*';
const corsOrigins = readCsv(rawCorsOrigins, ['*']);
const corsAllowAll = corsOrigins.includes('*');

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  host: readString('API_HOST', '0.0.0.0'),
  port: readNumber('API_PORT', 3001),
  corsAllowAll,
  corsOrigins,
  jwtSecret: readString('JWT_SECRET', 'ai-iot-safety-stove-control-local-secret'),
  opsJwtSecret: readString(
    'OPS_JWT_SECRET',
    readString('JWT_SECRET', 'ai-iot-safety-stove-control-local-secret')
  ),
  defaultAdmin: {
    username: readString('OPS_ADMIN_USERNAME', 'admin'),
    password: readString('OPS_ADMIN_PASSWORD', 'admin'),
    displayName: readString('OPS_ADMIN_DISPLAY_NAME', '超级管理员'),
  },
  databaseName: readString('PGDATABASE', 'ai_iot_safety_stove_control'),
  adminDatabase: readString('PGADMIN_DATABASE', 'postgres'),
  db: {
    host: readString('PGHOST', '127.0.0.1'),
    port: readNumber('PGPORT', 5432),
    user: readString('PGUSER', 'postgres'),
    password: readString('PGPASSWORD', 'admin@123'),
  },
  wechatMiniProgram: {
    appId: readString('WECHAT_MINI_APP_ID', ''),
    appSecret: readString('WECHAT_MINI_APP_SECRET', ''),
  },
  wechatApp: {
    appId: readString('WECHAT_APP_ID', ''),
    appSecret: readString('WECHAT_APP_SECRET', ''),
  },
  googleApp: {
    webClientId: readString('GOOGLE_APP_WEB_CLIENT_ID', ''),
  },
};
