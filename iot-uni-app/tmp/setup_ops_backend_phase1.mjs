import fs from 'fs';
import path from 'path';

const backendRoot = 'D:\\Desktop\\ranqizao\\iot-platform-backend-dev';

function assertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(relativePath, content) {
  const fullPath = path.join(backendRoot, relativePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, 'utf8');
}

function replaceOrThrow(source, searchValue, replaceValue, label) {
  if (!source.includes(searchValue)) {
    throw new Error(`Patch anchor not found: ${label}`);
  }

  return source.replace(searchValue, replaceValue);
}

function ensureContains(source, snippet, insertionPoint, label) {
  if (source.includes(snippet)) {
    return source;
  }

  if (!source.includes(insertionPoint)) {
    throw new Error(`Insertion anchor not found: ${label}`);
  }

  return source.replace(insertionPoint, `${snippet}${insertionPoint}`);
}

function patchEnvTs() {
  const content = `import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

function resolveProjectRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '../..');
}

function loadEnvFile() {
  const projectRoot = resolveProjectRoot();
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFilePath = path.join(projectRoot, '.env.example');

  if (fs.existsSync(envFilePath)) {
    dotenv.config({
      path: envFilePath,
      override: true,
    });
  }

  return nodeEnv;
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
    throw new Error(\`Environment variable \${name} must be a valid number.\`);
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
const rawCorsOrigins =
  process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '*';
const corsOrigins = readCsv(rawCorsOrigins, ['*']);
const corsAllowAll = corsOrigins.includes('*');

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  host: readString('API_HOST', '0.0.0.0'),
  port: readNumber('API_PORT', 3001),
  corsAllowAll,
  corsOrigins,
  jwtSecret: readString(
    'JWT_SECRET',
    'ai-iot-safety-stove-control-local-secret'
  ),
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
`;

  writeFile('src/config/env.ts', content);
}

function patchCreateAppTs() {
  const content = `import cors from 'cors';
import express from 'express';
import { env } from '../config/env';
import { query } from '../database/client';
import { authRouter } from '../modules/auth/router';
import { devicesRouter } from '../modules/devices/router';
import { homesRouter } from '../modules/homes/router';
import { opsAuthRouter } from '../modules/ops/auth/router';
import { opsDashboardRouter } from '../modules/ops/dashboard/router';
import { opsDevicesRouter } from '../modules/ops/devices/router';
import { opsSharesRouter } from '../modules/ops/shares/router';
import { opsUsersRouter } from '../modules/ops/users/router';
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

        callback(new Error(\`CORS origin is not allowed: \${origin}\`));
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

  app.use('/api/ops/auth', opsAuthRouter);
  app.use('/api/ops/dashboard', opsDashboardRouter);
  app.use('/api/ops/devices', opsDevicesRouter);
  app.use('/api/ops/users', opsUsersRouter);
  app.use('/api/ops/shares', opsSharesRouter);

  app.use(errorHandler);

  return app;
}
`;

  writeFile('src/app/createApp.ts', content);
}

function patchEnvExample() {
  const envPath = path.join(backendRoot, '.env.example');
  assertFile(envPath);
  let content = fs.readFileSync(envPath, 'utf8');

  if (!content.includes('OPS_JWT_SECRET=')) {
    content += `\n# 运维中台后台账号\nOPS_JWT_SECRET=\nOPS_ADMIN_USERNAME=admin\nOPS_ADMIN_PASSWORD=admin\nOPS_ADMIN_DISPLAY_NAME=超级管理员\n`;
  }

  fs.writeFileSync(envPath, content, 'utf8');
}

function patchBootstrapTs() {
  const bootstrapPath = path.join(backendRoot, 'src/database/bootstrap.ts');
  assertFile(bootstrapPath);
  let content = fs.readFileSync(bootstrapPath, 'utf8');

  const ensureDefaultAdminUserFn = `
async function ensureDefaultAdminUser(mainPool: Pool) {
  const defaultUsername = env.defaultAdmin.username;
  const defaultDisplayName = env.defaultAdmin.displayName;
  const defaultPasswordHash = await bcrypt.hash(env.defaultAdmin.password, 10);
  const existingAdmin = await mainPool.query<{ id: string }>(
    'SELECT id FROM admin_users WHERE username = $1 LIMIT 1',
    [defaultUsername]
  );

  let adminId = existingAdmin.rows[0]?.id;

  if (adminId) {
    await mainPool.query(
      \`
        UPDATE admin_users
        SET
          display_name = $2,
          role = 'super_admin',
          status = 'active',
          password_hash = COALESCE(password_hash, $3),
          updated_at = NOW()
        WHERE username = $1
      \`,
      [defaultUsername, defaultDisplayName, defaultPasswordHash]
    );
  } else {
    const inserted = await mainPool.query<{ id: string }>(
      \`
        INSERT INTO admin_users (
          id,
          username,
          password_hash,
          display_name,
          role,
          status
        )
        VALUES ($1, $2, $3, $4, 'super_admin', 'active')
        RETURNING id
      \`,
      [randomUUID(), defaultUsername, defaultPasswordHash, defaultDisplayName]
    );

    adminId = inserted.rows[0]?.id;
  }

  if (!adminId) {
    throw new Error('Failed to ensure default admin user.');
  }
}

`;

  if (!content.includes('async function ensureDefaultAdminUser')) {
    content = replaceOrThrow(
      content,
      'async function ensureSchema(mainPool: Pool) {',
      `${ensureDefaultAdminUserFn}async function ensureSchema(mainPool: Pool) {`,
      'insert ensureDefaultAdminUser'
    );
  }

  const adminUsersTable = `    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username VARCHAR(64) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role VARCHAR(32) NOT NULL
        CHECK (role IN ('super_admin', 'ops_admin', 'ops_viewer')),
      status VARCHAR(16) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled')),
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

`;

  if (!content.includes('CREATE TABLE IF NOT EXISTS admin_users')) {
    content = replaceOrThrow(
      content,
      '    CREATE TABLE IF NOT EXISTS homes (',
      `${adminUsersTable}    CREATE TABLE IF NOT EXISTS homes (`,
      'insert admin_users table'
    );
  }

  if (!content.includes('CREATE TABLE IF NOT EXISTS alerts')) {
    const createTablesAnchor = '  `);\n\n  await mainPool.query(`\n';
    const extraTables = `    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      device_sn TEXT NOT NULL,
      owner_uid VARCHAR(8) REFERENCES users(short_uid) ON DELETE SET NULL,
      type VARCHAR(32) NOT NULL
        CHECK (type IN ('gas_leak', 'dry_burn', 'over_temp', 'tilt', 'low_battery', 'offline')),
      level VARCHAR(16) NOT NULL
        CHECK (level IN ('critical', 'high', 'normal')),
      status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'resolved', 'false_positive')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metric_key VARCHAR(32),
      current_value DOUBLE PRECISION,
      threshold_value DOUBLE PRECISION,
      handler_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      handler_comment TEXT,
      is_false_positive BOOLEAN NOT NULL DEFAULT FALSE,
      triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      detail JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS command_audit (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      device_sn TEXT NOT NULL,
      operator_type VARCHAR(16) NOT NULL
        CHECK (operator_type IN ('admin', 'system', 'user')),
      operator_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      operator_user_uid VARCHAR(8) REFERENCES users(short_uid) ON DELETE SET NULL,
      operator_name TEXT NOT NULL,
      command_type VARCHAR(32) NOT NULL,
      request_payload JSONB,
      response_payload JSONB,
      status VARCHAR(16) NOT NULL
        CHECK (status IN ('pending', 'success', 'failed', 'timeout')),
      failure_reason TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
\n`;
    content = replaceOrThrow(
      content,
      createTablesAnchor,
      `\n${extraTables}${createTablesAnchor}`,
      'insert ops tables'
    );
  }

  if (!content.includes("ALTER TABLE devices ADD COLUMN IF NOT EXISTS locked BOOLEAN")) {
    content = replaceOrThrow(
      content,
      "    ALTER TABLE devices ADD COLUMN IF NOT EXISTS serial_number TEXT;\n",
      `    ALTER TABLE devices ADD COLUMN IF NOT EXISTS serial_number TEXT;\n    ALTER TABLE devices ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;\n    ALTER TABLE devices ADD COLUMN IF NOT EXISTS valve_status VARCHAR(16) NOT NULL DEFAULT 'closed';\n    ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;\n    ALTER TABLE devices ADD COLUMN IF NOT EXISTS region_code VARCHAR(16);\n    ALTER TABLE devices ADD COLUMN IF NOT EXISTS region_path TEXT;\n`,
      'insert device ops columns'
    );
  }

  if (!content.includes('idx_admin_users_username')) {
    content = replaceOrThrow(
      content,
      '    CREATE INDEX IF NOT EXISTS idx_devices_home_id ON devices(home_id);\n',
      `    CREATE INDEX IF NOT EXISTS idx_devices_home_id ON devices(home_id);\n    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username\n      ON admin_users(username);\n    CREATE INDEX IF NOT EXISTS idx_devices_last_heartbeat_at ON devices(last_heartbeat_at);\n    CREATE INDEX IF NOT EXISTS idx_devices_locked ON devices(locked);\n    CREATE INDEX IF NOT EXISTS idx_devices_region_code ON devices(region_code);\n`,
      'insert admin/device indexes'
    );
  }

  if (!content.includes('idx_alerts_status_level_triggered_at')) {
    content = replaceOrThrow(
      content,
      '    CREATE INDEX IF NOT EXISTS idx_device_binding_events_owner_id\n      ON device_binding_events(owner_id);\n',
      `    CREATE INDEX IF NOT EXISTS idx_device_binding_events_owner_id\n      ON device_binding_events(owner_id);\n    CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);\n    CREATE INDEX IF NOT EXISTS idx_alerts_status_level_triggered_at\n      ON alerts(status, level, triggered_at DESC);\n    CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);\n    CREATE INDEX IF NOT EXISTS idx_alerts_owner_uid ON alerts(owner_uid);\n    CREATE INDEX IF NOT EXISTS idx_command_audit_device_id_created_at\n      ON command_audit(device_id, created_at DESC);\n    CREATE INDEX IF NOT EXISTS idx_command_audit_status_created_at\n      ON command_audit(status, created_at DESC);\n    CREATE INDEX IF NOT EXISTS idx_command_audit_command_type\n      ON command_audit(command_type);\n    CREATE INDEX IF NOT EXISTS idx_command_audit_operator_admin_id\n      ON command_audit(operator_admin_id);\n`,
      'insert alert/command indexes'
    );
  }

  if (!content.includes('await ensureDefaultAdminUser(mainPool);')) {
    content = replaceOrThrow(
      content,
      '  await ensureDefaultUser(mainPool);\n',
      '  await ensureDefaultUser(mainPool);\n  await ensureDefaultAdminUser(mainPool);\n',
      'call ensureDefaultAdminUser'
    );
  }

  fs.writeFileSync(bootstrapPath, content, 'utf8');
}

function writeAdminAuth() {
  const content = `import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from './http';

export interface AdminAuthUser {
  adminId: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'ops_admin' | 'ops_viewer';
}

export interface AdminAuthenticatedRequest extends Request {
  admin?: AdminAuthUser;
}

export function signAdminAuthToken(user: AdminAuthUser) {
  return jwt.sign(user, env.opsJwtSecret, { expiresIn: '7d' });
}

export function requireAdminAuth(
  req: AdminAuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    next(new HttpError(401, '未登录或后台登录已失效。'));
    return;
  }

  try {
    const token = authorization.slice('Bearer '.length);
    req.admin = jwt.verify(token, env.opsJwtSecret) as AdminAuthUser;
    next();
  } catch {
    next(new HttpError(401, '后台登录状态无效，请重新登录。'));
  }
}
`;

  writeFile('src/shared/admin-auth.ts', content);
}

function writeOpsAuthModule() {
  const service = `import bcrypt from 'bcryptjs';
import { query } from '../../../database/client';
import { type AdminAuthUser, signAdminAuthToken } from '../../../shared/admin-auth';
import { HttpError } from '../../../shared/http';

interface AdminUserRow {
  id: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'ops_admin' | 'ops_viewer';
  status: 'active' | 'disabled';
  passwordHash: string;
}

function toAdminAuthUser(admin: AdminUserRow): AdminAuthUser {
  return {
    adminId: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    role: admin.role,
  };
}

async function getAdminByUsername(username: string) {
  const result = await query<AdminUserRow>(
    \`
      SELECT
        id,
        username,
        display_name AS "displayName",
        role,
        status,
        password_hash AS "passwordHash"
      FROM admin_users
      WHERE username = $1
      LIMIT 1
    \`,
    [String(username || '').trim()]
  );

  return result.rows[0] || null;
}

async function getAdminById(adminId: string) {
  const result = await query<Omit<AdminUserRow, 'passwordHash'>>(
    \`
      SELECT
        id,
        username,
        display_name AS "displayName",
        role,
        status
      FROM admin_users
      WHERE id = $1
      LIMIT 1
    \`,
    [adminId]
  );

  return result.rows[0] || null;
}

export async function loginAdmin(input: { username: string; password: string }) {
  const username = String(input.username || '').trim();
  const password = String(input.password || '');

  if (!username || !password) {
    throw new HttpError(400, '用户名和密码不能为空。');
  }

  const admin = await getAdminByUsername(username);
  if (!admin) {
    throw new HttpError(401, '账号或密码错误。');
  }

  if (admin.status !== 'active') {
    throw new HttpError(403, '当前后台账号已被禁用。');
  }

  const matched = await bcrypt.compare(password, admin.passwordHash);
  if (!matched) {
    throw new HttpError(401, '账号或密码错误。');
  }

  await query(
    'UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
    [admin.id]
  );

  const user = toAdminAuthUser(admin);
  return {
    token: signAdminAuthToken(user),
    user,
  };
}

export async function getCurrentAdmin(adminId: string) {
  const admin = await getAdminById(adminId);

  if (!admin) {
    throw new HttpError(404, '后台账号不存在。');
  }

  if (admin.status !== 'active') {
    throw new HttpError(403, '当前后台账号已被禁用。');
  }

  return {
    adminId: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    role: admin.role,
  };
}
`;

  const router = `import { Router } from 'express';
import { type AdminAuthenticatedRequest, requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { getCurrentAdmin, loginAdmin } from './service';

export const opsAuthRouter = Router();

opsAuthRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await loginAdmin({
      username: String(req.body?.username || ''),
      password: String(req.body?.password || ''),
    });

    res.json(result);
  })
);

opsAuthRouter.get(
  '/me',
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const user = await getCurrentAdmin(
      (req as AdminAuthenticatedRequest).admin!.adminId
    );
    res.json({ user });
  })
);

opsAuthRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});
`;

  writeFile('src/modules/ops/auth/service.ts', service);
  writeFile('src/modules/ops/auth/router.ts', router);
}

function writeOpsCommonDeviceView() {
  const content = `interface DeviceViewRowInput {
  id: string;
  sn: string | null;
  name: string;
  model: string | null;
  ownerUid: string;
  ownerDisplayName: string;
  firmwareVersion: string | null;
  inventoryStatus: string | null;
  location: unknown;
  isOn: boolean;
  fireLevel: number;
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
  locked: boolean;
  valveStatus: string;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const PROVINCES: Array<[string, string[]]> = [
  ['北京市', ['北京市', '北京']],
  ['天津市', ['天津市', '天津']],
  ['上海市', ['上海市', '上海']],
  ['重庆市', ['重庆市', '重庆']],
  ['河北省', ['河北省', '河北']],
  ['山西省', ['山西省', '山西']],
  ['辽宁省', ['辽宁省', '辽宁']],
  ['吉林省', ['吉林省', '吉林']],
  ['黑龙江省', ['黑龙江省', '黑龙江']],
  ['江苏省', ['江苏省', '江苏']],
  ['浙江省', ['浙江省', '浙江']],
  ['安徽省', ['安徽省', '安徽']],
  ['福建省', ['福建省', '福建']],
  ['江西省', ['江西省', '江西']],
  ['山东省', ['山东省', '山东']],
  ['河南省', ['河南省', '河南']],
  ['湖北省', ['湖北省', '湖北']],
  ['湖南省', ['湖南省', '湖南']],
  ['广东省', ['广东省', '广东']],
  ['海南省', ['海南省', '海南']],
  ['四川省', ['四川省', '四川']],
  ['贵州省', ['贵州省', '贵州']],
  ['云南省', ['云南省', '云南']],
  ['陕西省', ['陕西省', '陕西']],
  ['甘肃省', ['甘肃省', '甘肃']],
  ['青海省', ['青海省', '青海']],
  ['台湾省', ['台湾省', '台湾']],
  ['内蒙古自治区', ['内蒙古自治区', '内蒙古']],
  ['广西壮族自治区', ['广西壮族自治区', '广西']],
  ['西藏自治区', ['西藏自治区', '西藏']],
  ['宁夏回族自治区', ['宁夏回族自治区', '宁夏']],
  ['新疆维吾尔自治区', ['新疆维吾尔自治区', '新疆']],
  ['香港特别行政区', ['香港特别行政区', '香港']],
  ['澳门特别行政区', ['澳门特别行政区', '澳门']],
];

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized) {
        return normalized;
      }
    }
  }

  return '';
}

function inferProvince(address: string) {
  for (const [province, keywords] of PROVINCES) {
    if (keywords.some((keyword) => address.includes(keyword))) {
      return province;
    }
  }

  return '';
}

function inferCity(address: string, province: string) {
  const cityMatches = address.match(/[\\u4e00-\\u9fa5]{2,12}市/g) || [];

  for (const match of cityMatches) {
    if (match !== province) {
      return match;
    }
  }

  return '';
}

export function normalizeLocation(location: unknown) {
  const record = asRecord(location);
  const address = readString(
    record?.address,
    record?.formattedAddress,
    record?.addr,
    record?.poiName
  );
  const country = readString(record?.country) || (address ? '中国' : '');
  const province = readString(record?.province) || inferProvince(address);
  const city = readString(record?.city) || inferCity(address, province);
  const district = readString(record?.district);
  const latitude =
    typeof record?.latitude === 'number' ? record.latitude : null;
  const longitude =
    typeof record?.longitude === 'number' ? record.longitude : null;

  return {
    country,
    province,
    city,
    district,
    address,
    latitude,
    longitude,
    regionPath: [country, province, city].filter(Boolean).join('·'),
  };
}

export function deriveOnline(lastHeartbeatAt: string | null) {
  if (!lastHeartbeatAt) {
    return false;
  }

  const timestamp = new Date(lastHeartbeatAt).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= 5 * 60 * 1000;
}

export function deriveDeviceStatus(input: {
  online: boolean;
  locked: boolean;
  gas: number;
  smoke: number;
  vibration: boolean;
}) {
  if (!input.online) {
    return 'offline';
  }

  if (input.locked) {
    return 'locked';
  }

  if (input.gas >= 0.1 || input.smoke >= 10 || input.vibration) {
    return 'alert';
  }

  return 'normal';
}

export function mapDeviceRowToView(row: DeviceViewRowInput) {
  const normalizedLocation = normalizeLocation(row.location);
  const online = deriveOnline(row.lastHeartbeatAt);
  const status = deriveDeviceStatus({
    online,
    locked: row.locked,
    gas: Number(row.gas || 0),
    smoke: Number(row.smoke || 0),
    vibration: Boolean(row.vibration),
  });

  return {
    id: row.id,
    sn: row.sn || '',
    name: row.name,
    model: row.model || '',
    ownerUid: row.ownerUid,
    ownerDisplayName: row.ownerDisplayName,
    firmwareVersion: row.firmwareVersion || '',
    inventoryStatus: row.inventoryStatus || '',
    online,
    status,
    fire: Boolean(row.isOn),
    fireStatus: row.isOn ? 'on' : 'off',
    fireLevel: Number(row.fireLevel || 0),
    temp: Number(row.temp || 0),
    gas: Number(row.gas || 0),
    smoke: Number(row.smoke || 0),
    flow: Number(row.flow || 0),
    humanDetected: Boolean(row.humanDetected),
    vibration: Boolean(row.vibration),
    locked: Boolean(row.locked),
    valveStatus: row.valveStatus || 'closed',
    lastHeartbeatAt: row.lastHeartbeatAt,
    region: normalizedLocation.regionPath || '未知区域',
    country: normalizedLocation.country,
    province: normalizedLocation.province,
    city: normalizedLocation.city,
    district: normalizedLocation.district,
    address: normalizedLocation.address,
    latitude: normalizedLocation.latitude,
    longitude: normalizedLocation.longitude,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
`;

  writeFile('src/modules/ops/common/device-view.ts', content);
}

function writeOpsDevicesModule() {
  const service = `import { query } from '../../../database/client';
import { HttpError } from '../../../shared/http';
import { mapDeviceRowToView } from '../common/device-view';

interface OpsDeviceRow {
  id: string;
  sn: string | null;
  name: string;
  model: string | null;
  ownerUid: string;
  ownerDisplayName: string;
  firmwareVersion: string | null;
  inventoryStatus: string | null;
  location: unknown;
  isOn: boolean;
  fireLevel: number;
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
  locked: boolean;
  valveStatus: string;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const OPS_DEVICE_SELECT_SQL = \`
  SELECT
    d.id,
    COALESCE(d.serial_number, di.serial_number) AS "sn",
    d.name,
    di.product_model AS "model",
    d.owner_id AS "ownerUid",
    owner_user.display_name AS "ownerDisplayName",
    di.firmware_version AS "firmwareVersion",
    di.status AS "inventoryStatus",
    d.location,
    d.is_on AS "isOn",
    d.fire_level AS "fireLevel",
    d.temp,
    d.gas,
    d.smoke,
    d.flow,
    d.human_detected AS "humanDetected",
    d.vibration,
    d.locked,
    d.valve_status AS "valveStatus",
    d.last_heartbeat_at AS "lastHeartbeatAt",
    d.created_at AS "createdAt",
    d.updated_at AS "updatedAt"
  FROM devices d
  INNER JOIN users owner_user
    ON owner_user.short_uid = d.owner_id
  LEFT JOIN device_inventory di
    ON di.id = d.inventory_id
\`;

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function applyDeviceFilters(devices: ReturnType<typeof mapDeviceRowToView>[], filters: {
  search: string;
  status: string;
  online: string;
  model: string;
  country: string;
  province: string;
  city: string;
}) {
  return devices.filter((device) => {
    const matchesSearch = !filters.search
      || device.sn.toLowerCase().includes(filters.search)
      || device.name.toLowerCase().includes(filters.search)
      || device.ownerUid.toLowerCase().includes(filters.search)
      || device.ownerDisplayName.toLowerCase().includes(filters.search)
      || device.address.toLowerCase().includes(filters.search);
    const matchesStatus = !filters.status || device.status === filters.status;
    const matchesOnline = !filters.online
      || (filters.online === 'online' ? device.online : !device.online);
    const matchesModel = !filters.model || device.model === filters.model;
    const matchesCountry = !filters.country || device.country === filters.country;
    const matchesProvince = !filters.province || device.province === filters.province;
    const matchesCity = !filters.city || device.city === filters.city;

    return (
      matchesSearch
      && matchesStatus
      && matchesOnline
      && matchesModel
      && matchesCountry
      && matchesProvince
      && matchesCity
    );
  });
}

export async function listOpsDevices(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  status?: unknown;
  online?: unknown;
  model?: unknown;
  country?: unknown;
  province?: unknown;
  city?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = Math.min(normalizePage(input.pageSize, 20), 100);
  const search = String(input.search || '').trim().toLowerCase();
  const status = String(input.status || '').trim();
  const online = String(input.online || '').trim();
  const model = String(input.model || '').trim();
  const country = String(input.country || '').trim();
  const province = String(input.province || '').trim();
  const city = String(input.city || '').trim();

  const result = await query<OpsDeviceRow>(
    \`\${OPS_DEVICE_SELECT_SQL}
      ORDER BY d.updated_at DESC
    \`
  );

  const filtered = applyDeviceFilters(
    result.rows.map((row) => mapDeviceRowToView(row)),
    { search, status, online, model, country, province, city }
  );

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function getOpsDevice(deviceId: string) {
  const result = await query<OpsDeviceRow>(
    \`\${OPS_DEVICE_SELECT_SQL}
      WHERE d.id = $1
      LIMIT 1
    \`,
    [deviceId]
  );

  const row = result.rows[0] || null;
  if (!row) {
    throw new HttpError(404, '设备不存在。');
  }

  const device = mapDeviceRowToView(row);

  const sharedUsersResult = await query<{ uid: string; displayName: string }>(
    \`
      SELECT
        u.short_uid AS uid,
        u.display_name AS "displayName"
      FROM device_shares ds
      INNER JOIN users u
        ON u.short_uid = ds.user_id
      WHERE ds.device_id = $1
      ORDER BY ds.created_at DESC
    \`,
    [deviceId]
  );

  const homeLinksResult = await query<{ id: string; name: string }>(
    \`
      SELECT
        h.id,
        h.name
      FROM home_device_links hdl
      INNER JOIN homes h
        ON h.id = hdl.home_id
      WHERE hdl.device_id = $1
      ORDER BY h.created_at DESC
    \`,
    [deviceId]
  );

  return {
    device,
    owner: {
      uid: device.ownerUid,
      displayName: device.ownerDisplayName,
    },
    sharedUsers: sharedUsersResult.rows,
    homes: homeLinksResult.rows,
  };
}

export async function getOpsDeviceRealtimeMetrics(deviceId: string) {
  const { device } = await getOpsDevice(deviceId);

  return {
    temp: device.temp,
    gas: device.gas,
    smoke: device.smoke,
    flow: device.flow,
    fireLevel: device.fireLevel,
    fire: device.fire,
    valveStatus: device.valveStatus,
    humanDetected: device.humanDetected,
    vibration: device.vibration,
    locked: device.locked,
    online: device.online,
    collectedAt: device.lastHeartbeatAt || device.updatedAt,
  };
}

export async function getOpsDeviceCommands(deviceId: string) {
  const result = await query(
    \`
      SELECT
        id,
        command_type AS "commandType",
        operator_type AS "operatorType",
        operator_name AS "operatorName",
        status,
        failure_reason AS "failureReason",
        started_at AS "startedAt",
        finished_at AS "finishedAt"
      FROM command_audit
      WHERE device_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    \`,
    [deviceId]
  );

  return result.rows;
}

export async function getOpsDeviceAlerts(deviceId: string) {
  const result = await query(
    \`
      SELECT
        id,
        type,
        level,
        status,
        title,
        message,
        triggered_at AS "triggeredAt",
        resolved_at AS "resolvedAt"
      FROM alerts
      WHERE device_id = $1
      ORDER BY triggered_at DESC
      LIMIT 50
    \`,
    [deviceId]
  );

  return result.rows;
}
`;

  const router = `import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import {
  getOpsDevice,
  getOpsDeviceAlerts,
  getOpsDeviceCommands,
  getOpsDeviceRealtimeMetrics,
  listOpsDevices,
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
`;

  writeFile('src/modules/ops/devices/service.ts', service);
  writeFile('src/modules/ops/devices/router.ts', router);
}

function writeOpsUsersModule() {
  const service = `import { query } from '../../../database/client';
import { HttpError } from '../../../shared/http';
import { mapDeviceRowToView } from '../common/device-view';

interface UserListRow {
  userId: string;
  uid: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  status: string;
  bindCount: string;
  shareCount: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserDeviceRow {
  id: string;
  sn: string | null;
  name: string;
  model: string | null;
  ownerUid: string;
  ownerDisplayName: string;
  firmwareVersion: string | null;
  inventoryStatus: string | null;
  location: unknown;
  isOn: boolean;
  fireLevel: number;
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
  locked: boolean;
  valveStatus: string;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function listOpsUsers(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = Math.min(normalizePage(input.pageSize, 20), 100);
  const search = String(input.search || '').trim().toLowerCase();
  const status = String(input.status || '').trim();

  const result = await query<UserListRow>(
    \`
      SELECT
        u.id AS "userId",
        u.short_uid AS uid,
        u.display_name AS "displayName",
        u.primary_phone AS phone,
        u.primary_email AS email,
        u.status,
        (
          SELECT COUNT(*)::text
          FROM devices d
          WHERE d.owner_id = u.short_uid
        ) AS "bindCount",
        (
          SELECT COUNT(*)::text
          FROM device_shares ds
          WHERE ds.user_id = u.short_uid
        ) AS "shareCount",
        (
          SELECT MAX(ai.last_login_at)::text
          FROM auth_identities ai
          WHERE ai.user_pk = u.id
        ) AS "lastLoginAt",
        u.created_at AS "createdAt"
      FROM users u
      ORDER BY u.created_at DESC
    \`
  );

  const filtered = result.rows.filter((row) => {
    const matchesSearch = !search
      || row.uid.toLowerCase().includes(search)
      || row.displayName.toLowerCase().includes(search)
      || String(row.phone || '').toLowerCase().includes(search)
      || String(row.email || '').toLowerCase().includes(search);
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesStatus;
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize).map((row) => ({
      userId: row.userId,
      uid: row.uid,
      displayName: row.displayName,
      phone: row.phone,
      email: row.email,
      status: row.status,
      bindCount: Number(row.bindCount || 0),
      shareCount: Number(row.shareCount || 0),
      lastLoginAt: row.lastLoginAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function getOpsUser(uid: string) {
  const userResult = await query<{
    userId: string;
    uid: string;
    displayName: string;
    phone: string | null;
    email: string | null;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
  }>(
    \`
      SELECT
        u.id AS "userId",
        u.short_uid AS uid,
        u.display_name AS "displayName",
        u.primary_phone AS phone,
        u.primary_email AS email,
        u.status,
        (
          SELECT MAX(ai.last_login_at)::text
          FROM auth_identities ai
          WHERE ai.user_pk = u.id
        ) AS "lastLoginAt",
        u.created_at AS "createdAt"
      FROM users u
      WHERE u.short_uid = $1
      LIMIT 1
    \`,
    [uid]
  );

  const user = userResult.rows[0] || null;
  if (!user) {
    throw new HttpError(404, '用户不存在。');
  }

  const boundDevicesResult = await query<UserDeviceRow>(
    \`
      SELECT
        d.id,
        COALESCE(d.serial_number, di.serial_number) AS "sn",
        d.name,
        di.product_model AS "model",
        d.owner_id AS "ownerUid",
        owner_user.display_name AS "ownerDisplayName",
        di.firmware_version AS "firmwareVersion",
        di.status AS "inventoryStatus",
        d.location,
        d.is_on AS "isOn",
        d.fire_level AS "fireLevel",
        d.temp,
        d.gas,
        d.smoke,
        d.flow,
        d.human_detected AS "humanDetected",
        d.vibration,
        d.locked,
        d.valve_status AS "valveStatus",
        d.last_heartbeat_at AS "lastHeartbeatAt",
        d.created_at AS "createdAt",
        d.updated_at AS "updatedAt"
      FROM devices d
      INNER JOIN users owner_user
        ON owner_user.short_uid = d.owner_id
      LEFT JOIN device_inventory di
        ON di.id = d.inventory_id
      WHERE d.owner_id = $1
      ORDER BY d.updated_at DESC
    \`,
    [uid]
  );

  const sharedDevicesResult = await query<{
    id: string;
    sn: string | null;
    name: string;
    model: string | null;
    ownerUid: string;
    ownerDisplayName: string;
    createdAt: string;
  }>(
    \`
      SELECT
        d.id,
        COALESCE(d.serial_number, di.serial_number) AS "sn",
        d.name,
        di.product_model AS "model",
        d.owner_id AS "ownerUid",
        owner_user.display_name AS "ownerDisplayName",
        ds.created_at AS "createdAt"
      FROM device_shares ds
      INNER JOIN devices d
        ON d.id = ds.device_id
      INNER JOIN users owner_user
        ON owner_user.short_uid = d.owner_id
      LEFT JOIN device_inventory di
        ON di.id = d.inventory_id
      WHERE ds.user_id = $1
      ORDER BY ds.created_at DESC
    \`,
    [uid]
  );

  return {
    user,
    boundDevices: boundDevicesResult.rows.map((row) => mapDeviceRowToView(row)),
    sharedDevices: sharedDevicesResult.rows.map((row) => ({
      id: row.id,
      sn: row.sn || '',
      name: row.name,
      model: row.model || '',
      ownerUid: row.ownerUid,
      ownerDisplayName: row.ownerDisplayName,
      permissions: ['view', 'control'],
      createdAt: row.createdAt,
    })),
  };
}
`;

  const router = `import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { getOpsUser, listOpsUsers } from './service';

export const opsUsersRouter = Router();

opsUsersRouter.use(requireAdminAuth);

opsUsersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOpsUsers(req.query || {});
    res.json(result);
  })
);

opsUsersRouter.get(
  '/:uid',
  asyncHandler(async (req, res) => {
    const result = await getOpsUser(req.params.uid);
    res.json(result);
  })
);
`;

  writeFile('src/modules/ops/users/service.ts', service);
  writeFile('src/modules/ops/users/router.ts', router);
}

function writeOpsSharesModule() {
  const service = `import { query } from '../../../database/client';

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function listOpsShares(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = Math.min(normalizePage(input.pageSize, 20), 100);
  const search = String(input.search || '').trim().toLowerCase();

  const result = await query<{
    id: string;
    type: string;
    resourceId: string;
    resourceSn: string | null;
    resourceName: string;
    ownerUid: string;
    ownerDisplayName: string;
    sharedToUid: string;
    sharedToDisplayName: string;
    createdAt: string;
  }>(
    \`
      SELECT
        ds.device_id || '-' || ds.user_id AS id,
        'device_share' AS type,
        d.id AS "resourceId",
        COALESCE(d.serial_number, di.serial_number) AS "resourceSn",
        d.name AS "resourceName",
        owner_user.short_uid AS "ownerUid",
        owner_user.display_name AS "ownerDisplayName",
        target_user.short_uid AS "sharedToUid",
        target_user.display_name AS "sharedToDisplayName",
        ds.created_at AS "createdAt"
      FROM device_shares ds
      INNER JOIN devices d
        ON d.id = ds.device_id
      INNER JOIN users owner_user
        ON owner_user.short_uid = d.owner_id
      INNER JOIN users target_user
        ON target_user.short_uid = ds.user_id
      LEFT JOIN device_inventory di
        ON di.id = d.inventory_id
      ORDER BY ds.created_at DESC
    \`
  );

  const filtered = result.rows.filter((row) => {
    if (!search) {
      return true;
    }

    return (
      String(row.resourceSn || '').toLowerCase().includes(search)
      || row.resourceName.toLowerCase().includes(search)
      || row.ownerUid.toLowerCase().includes(search)
      || row.ownerDisplayName.toLowerCase().includes(search)
      || row.sharedToUid.toLowerCase().includes(search)
      || row.sharedToDisplayName.toLowerCase().includes(search)
    );
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize).map((row) => ({
      id: row.id,
      type: row.type,
      resourceId: row.resourceId,
      resourceSn: row.resourceSn || '',
      resourceName: row.resourceName,
      ownerUid: row.ownerUid,
      ownerDisplayName: row.ownerDisplayName,
      sharedToUid: row.sharedToUid,
      sharedToDisplayName: row.sharedToDisplayName,
      permissions: ['view', 'control'],
      expiry: null,
      createdAt: row.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}
`;

  const router = `import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { listOpsShares } from './service';

export const opsSharesRouter = Router();

opsSharesRouter.use(requireAdminAuth);

opsSharesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOpsShares(req.query || {});
    res.json(result);
  })
);
`;

  writeFile('src/modules/ops/shares/service.ts', service);
  writeFile('src/modules/ops/shares/router.ts', router);
}

function writeOpsDashboardModule() {
  const service = `import { query } from '../../../database/client';
import { deriveDeviceStatus, deriveOnline, normalizeLocation } from '../common/device-view';

interface DashboardDeviceRow {
  id: string;
  location: unknown;
  gas: number;
  smoke: number;
  vibration: boolean;
  locked: boolean;
  lastHeartbeatAt: string | null;
  createdAt: string;
}

export async function getOpsDashboardSummary() {
  const devicesResult = await query<DashboardDeviceRow>(
    \`
      SELECT
        d.id,
        d.location,
        d.gas,
        d.smoke,
        d.vibration,
        d.locked,
        d.last_heartbeat_at AS "lastHeartbeatAt",
        d.created_at AS "createdAt"
      FROM devices d
    \`
  );

  const now = new Date();
  let onlineDevices = 0;
  let offlineDevices = 0;
  let alertDevices = 0;
  let todayNewDevices = 0;

  for (const row of devicesResult.rows) {
    const online = deriveOnline(row.lastHeartbeatAt);
    const status = deriveDeviceStatus({
      online,
      locked: row.locked,
      gas: Number(row.gas || 0),
      smoke: Number(row.smoke || 0),
      vibration: Boolean(row.vibration),
    });

    if (online) {
      onlineDevices += 1;
    } else {
      offlineDevices += 1;
    }

    if (status === 'alert') {
      alertDevices += 1;
    }

    const createdAt = new Date(row.createdAt);
    if (
      createdAt.getFullYear() === now.getFullYear()
      && createdAt.getMonth() === now.getMonth()
      && createdAt.getDate() === now.getDate()
    ) {
      todayNewDevices += 1;
    }
  }

  const alertsResult = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM alerts WHERE status = 'pending'"
  );

  return {
    totalDevices: devicesResult.rows.length,
    onlineDevices,
    offlineDevices,
    alertDevices,
    todayNewDevices,
    activeAlerts: Number(alertsResult.rows[0]?.count || 0),
  };
}

export async function getOpsDashboardMap(input: {
  level?: unknown;
  country?: unknown;
  province?: unknown;
}) {
  const level = String(input.level || 'province').trim();
  const country = String(input.country || '').trim();
  const province = String(input.province || '').trim();

  const result = await query<DashboardDeviceRow>(
    \`
      SELECT
        d.id,
        d.location,
        d.gas,
        d.smoke,
        d.vibration,
        d.locked,
        d.last_heartbeat_at AS "lastHeartbeatAt",
        d.created_at AS "createdAt"
      FROM devices d
    \`
  );

  const bucketMap = new Map<string, { total: number; online: number; offline: number; alert: number }>();

  for (const row of result.rows) {
    const normalizedLocation = normalizeLocation(row.location);
    const online = deriveOnline(row.lastHeartbeatAt);
    const status = deriveDeviceStatus({
      online,
      locked: row.locked,
      gas: Number(row.gas || 0),
      smoke: Number(row.smoke || 0),
      vibration: Boolean(row.vibration),
    });

    if (country && normalizedLocation.country && normalizedLocation.country !== country) {
      continue;
    }

    if (province && normalizedLocation.province && normalizedLocation.province !== province) {
      continue;
    }

    const bucketName =
      level === 'city'
        ? normalizedLocation.city || '未知城市'
        : normalizedLocation.province || '未知区域';

    if (!bucketMap.has(bucketName)) {
      bucketMap.set(bucketName, {
        total: 0,
        online: 0,
        offline: 0,
        alert: 0,
      });
    }

    const bucket = bucketMap.get(bucketName)!;
    bucket.total += 1;
    if (online) {
      bucket.online += 1;
    } else {
      bucket.offline += 1;
    }
    if (status === 'alert') {
      bucket.alert += 1;
    }
  }

  return {
    level,
    items: Array.from(bucketMap.entries()).map(([name, stats]) => ({
      name,
      total: stats.total,
      online: stats.online,
      offline: stats.offline,
      alert: stats.alert,
    })),
  };
}
`;

  const router = `import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { getOpsDashboardMap, getOpsDashboardSummary } from './service';

export const opsDashboardRouter = Router();

opsDashboardRouter.use(requireAdminAuth);

opsDashboardRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const summary = await getOpsDashboardSummary();
    res.json({ summary });
  })
);

opsDashboardRouter.get(
  '/map',
  asyncHandler(async (req, res) => {
    const result = await getOpsDashboardMap(req.query || {});
    res.json(result);
  })
);
`;

  writeFile('src/modules/ops/dashboard/service.ts', service);
  writeFile('src/modules/ops/dashboard/router.ts', router);
}

function patchBackend() {
  patchEnvTs();
  patchCreateAppTs();
  patchEnvExample();
  patchBootstrapTs();
  writeAdminAuth();
  writeOpsCommonDeviceView();
  writeOpsAuthModule();
  writeOpsDevicesModule();
  writeOpsUsersModule();
  writeOpsSharesModule();
  writeOpsDashboardModule();
}

patchBackend();
console.log('Ops backend phase 1 files generated successfully.');
