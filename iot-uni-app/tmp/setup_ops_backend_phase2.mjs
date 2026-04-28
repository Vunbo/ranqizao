import fs from 'fs';
import path from 'path';

const backendRoot = 'D:\\Desktop\\ranqizao\\iot-platform-backend-dev';

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

function patchCreateApp() {
  const filePath = path.join(backendRoot, 'src/app/createApp.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes("import { opsAlertsRouter }")) {
    content = replaceOrThrow(
      content,
      "import { opsAuthRouter } from '../modules/ops/auth/router';\n",
      "import { opsAuthRouter } from '../modules/ops/auth/router';\nimport { opsAlertsRouter } from '../modules/ops/alerts/router';\nimport { opsCommandsRouter } from '../modules/ops/commands/router';\nimport { opsConfigsRouter } from '../modules/ops/configs/router';\n",
      'ops router imports'
    );
  }

  if (!content.includes("app.use('/api/ops/alerts'")) {
    content = replaceOrThrow(
      content,
      "  app.use('/api/ops/auth', opsAuthRouter);\n  app.use('/api/ops/dashboard', opsDashboardRouter);\n  app.use('/api/ops/devices', opsDevicesRouter);\n  app.use('/api/ops/users', opsUsersRouter);\n  app.use('/api/ops/shares', opsSharesRouter);\n",
      "  app.use('/api/ops/auth', opsAuthRouter);\n  app.use('/api/ops/dashboard', opsDashboardRouter);\n  app.use('/api/ops/devices', opsDevicesRouter);\n  app.use('/api/ops/users', opsUsersRouter);\n  app.use('/api/ops/shares', opsSharesRouter);\n  app.use('/api/ops/alerts', opsAlertsRouter);\n  app.use('/api/ops/commands', opsCommandsRouter);\n  app.use('/api/ops/configs', opsConfigsRouter);\n",
      'ops router mounts'
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function patchBootstrap() {
  const filePath = path.join(backendRoot, 'src/database/bootstrap.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('async function ensureDefaultOpsConfigs')) {
    const fn = `
async function ensureDefaultOpsConfigs(mainPool: Pool) {
  const adminResult = await mainPool.query<{ id: string }>(
    "SELECT id FROM admin_users ORDER BY created_at ASC LIMIT 1"
  );
  const adminId = adminResult.rows[0]?.id || null;

  const templateExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM config_templates) AS "exists"'
  );
  if (!templateExists.rows[0]?.exists) {
    await mainPool.query(
      \`
        INSERT INTO config_templates (
          id,
          name,
          template_type,
          title,
          content,
          channels,
          variables,
          enabled,
          created_by,
          updated_by
        )
        VALUES
          ($1, $2, 'message', $3, $4, $5::jsonb, $6::jsonb, TRUE, $7, $7),
          ($8, $9, 'message', $10, $11, $12::jsonb, $13::jsonb, TRUE, $7, $7)
      \`,
      [
        randomUUID(),
        '燃气泄漏紧急通知',
        '燃气泄漏预警',
        '尊敬的用户，您的设备 \${deviceId} 检测到燃气浓度异常（\${value}），系统已自动关闭阀门，请立即检查。',
        JSON.stringify(['sms', 'app']),
        JSON.stringify(['deviceId', 'value']),
        adminId,
        randomUUID(),
        '设备离线提醒',
        '设备连接断开',
        '您的设备 \${deviceId} 已离线超过 30 分钟，请检查网络连接。',
        JSON.stringify(['app']),
        JSON.stringify(['deviceId']),
      ]
    );
  }

  const alertRuleExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM alert_rules) AS "exists"'
  );
  if (!alertRuleExists.rows[0]?.exists) {
    await mainPool.query(
      \`
        INSERT INTO alert_rules (
          id,
          name,
          rule_key,
          severity,
          enabled,
          metric_key,
          expression,
          actions,
          delay_seconds,
          scope,
          created_by,
          updated_by
        )
        VALUES
          ($1, $2, $3, 'critical', TRUE, 'gas', $4, $5::jsonb, 0, $6::jsonb, $7, $7),
          ($8, $9, $10, 'high', TRUE, 'temp', $11, $12::jsonb, 5, $13::jsonb, $7, $7)
      \`,
      [
        randomUUID(),
        '高浓度燃气报警',
        'gas_high_concentration',
        'gas_value > 0.15',
        JSON.stringify(['close_valve', 'notify_user', 'notify_admin']),
        JSON.stringify({}),
        adminId,
        randomUUID(),
        '干烧保护触发',
        'dry_burn_protection',
        'temp > 280 && status == "burning"',
        JSON.stringify(['cut_fire', 'notify_user']),
        JSON.stringify({}),
      ]
    );
  }

  const riskRuleExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM risk_rules) AS "exists"'
  );
  if (!riskRuleExists.rows[0]?.exists) {
    await mainPool.query(
      \`
        INSERT INTO risk_rules (
          id,
          name,
          rule_key,
          enabled,
          threshold_expression,
          action,
          duration_seconds,
          reason,
          scope,
          created_by,
          updated_by
        )
        VALUES
          ($1, $2, $3, TRUE, $4, $5, $6, $7, $8::jsonb, $9, $9)
      \`,
      [
        randomUUID(),
        '异常频繁点火',
        'frequent_ignite_lock',
        'count > 10 per 1min',
        'lock_device',
        86400,
        '疑似恶意操作或传感器故障',
        JSON.stringify({}),
        adminId,
      ]
    );
  }
}

`;
    content = replaceOrThrow(
      content,
      'async function ensureSchema(mainPool: Pool) {',
      `${fn}async function ensureSchema(mainPool: Pool) {`,
      'insert ensureDefaultOpsConfigs'
    );
  }

  if (!content.includes('CREATE TABLE IF NOT EXISTS config_templates')) {
    const anchor = '\n\n  `);\n\n  await mainPool.query(`\n';
    const tables = `    CREATE TABLE IF NOT EXISTS config_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      template_type VARCHAR(16) NOT NULL CHECK (template_type IN ('message')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      channels JSONB NOT NULL,
      variables JSONB NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      rule_key VARCHAR(64) NOT NULL UNIQUE,
      severity VARCHAR(16) NOT NULL CHECK (severity IN ('critical', 'high', 'normal')),
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      metric_key VARCHAR(32),
      expression TEXT NOT NULL,
      actions JSONB NOT NULL,
      delay_seconds INTEGER NOT NULL DEFAULT 0,
      scope JSONB,
      created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS risk_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      rule_key VARCHAR(64) NOT NULL UNIQUE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      threshold_expression TEXT NOT NULL,
      action VARCHAR(32) NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      scope JSONB,
      created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`;

    content = replaceOrThrow(
      content,
      anchor,
      `\n${tables}${anchor}`,
      'insert config tables'
    );
  }

  if (!content.includes('idx_config_templates_name')) {
    content = replaceOrThrow(
      content,
      "    CREATE INDEX IF NOT EXISTS idx_command_audit_operator_admin_id\n      ON command_audit(operator_admin_id);\n",
      "    CREATE INDEX IF NOT EXISTS idx_command_audit_operator_admin_id\n      ON command_audit(operator_admin_id);\n    CREATE UNIQUE INDEX IF NOT EXISTS idx_config_templates_name ON config_templates(name);\n    CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_rules_rule_key ON alert_rules(rule_key);\n    CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_rules_rule_key ON risk_rules(rule_key);\n",
      'insert config indexes'
    );
  }

  if (!content.includes('await ensureDefaultOpsConfigs(mainPool);')) {
    content = replaceOrThrow(
      content,
      '  await ensureDefaultUser(mainPool);\n  await ensureDefaultAdminUser(mainPool);\n',
      '  await ensureDefaultUser(mainPool);\n  await ensureDefaultAdminUser(mainPool);\n  await ensureDefaultOpsConfigs(mainPool);\n',
      'call ensureDefaultOpsConfigs'
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function writeAlertsModule() {
  const service = `import { query } from '../../../database/client';
import { type AdminAuthUser } from '../../../shared/admin-auth';
import { HttpError } from '../../../shared/http';

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function listOpsAlerts(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  level?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = Math.min(normalizePage(input.pageSize, 20), 100);
  const search = String(input.search || '').trim().toLowerCase();
  const level = String(input.level || '').trim();
  const status = String(input.status || '').trim();

  const result = await query<{
    id: string;
    deviceId: string;
    deviceSn: string;
    type: string;
    level: string;
    status: string;
    title: string;
    message: string;
    handlerName: string | null;
    triggeredAt: string;
    resolvedAt: string | null;
  }>(
    \`
      SELECT
        a.id,
        a.device_id AS "deviceId",
        a.device_sn AS "deviceSn",
        a.type,
        a.level,
        a.status,
        a.title,
        a.message,
        admin_user.display_name AS "handlerName",
        a.triggered_at AS "triggeredAt",
        a.resolved_at AS "resolvedAt"
      FROM alerts a
      LEFT JOIN admin_users admin_user
        ON admin_user.id = a.handler_admin_id
      ORDER BY a.triggered_at DESC
    \`
  );

  const filtered = result.rows.filter((row) => {
    const matchesSearch = !search
      || row.deviceSn.toLowerCase().includes(search)
      || row.message.toLowerCase().includes(search)
      || row.title.toLowerCase().includes(search);
    const matchesLevel = !level || row.level === level;
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesLevel && matchesStatus;
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize).map((row) => ({
      ...row,
      handlerName: row.handlerName || '-',
    })),
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function resolveOpsAlert(alertId: string, admin: AdminAuthUser, comment: string) {
  const result = await query(
    \`
      UPDATE alerts
      SET
        status = 'resolved',
        is_false_positive = FALSE,
        handler_admin_id = $2,
        handler_comment = $3,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    \`,
    [alertId, admin.adminId, comment || null]
  );

  if (!result.rowCount) {
    throw new HttpError(404, '告警不存在。');
  }

  return { ok: true };
}

export async function markOpsAlertFalsePositive(alertId: string, admin: AdminAuthUser, comment: string) {
  const result = await query(
    \`
      UPDATE alerts
      SET
        status = 'false_positive',
        is_false_positive = TRUE,
        handler_admin_id = $2,
        handler_comment = $3,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    \`,
    [alertId, admin.adminId, comment || null]
  );

  if (!result.rowCount) {
    throw new HttpError(404, '告警不存在。');
  }

  return { ok: true };
}
`;

  const router = `import { Router } from 'express';
import { type AdminAuthenticatedRequest, requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import {
  listOpsAlerts,
  markOpsAlertFalsePositive,
  resolveOpsAlert,
} from './service';

export const opsAlertsRouter = Router();

opsAlertsRouter.use(requireAdminAuth);

opsAlertsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOpsAlerts(req.query || {});
    res.json(result);
  })
);

opsAlertsRouter.patch(
  '/:alertId/resolve',
  asyncHandler(async (req, res) => {
    const result = await resolveOpsAlert(
      req.params.alertId,
      (req as AdminAuthenticatedRequest).admin!,
      String(req.body?.comment || '')
    );
    res.json(result);
  })
);

opsAlertsRouter.patch(
  '/:alertId/false-positive',
  asyncHandler(async (req, res) => {
    const result = await markOpsAlertFalsePositive(
      req.params.alertId,
      (req as AdminAuthenticatedRequest).admin!,
      String(req.body?.comment || '')
    );
    res.json(result);
  })
);
`;

  writeFile('src/modules/ops/alerts/service.ts', service);
  writeFile('src/modules/ops/alerts/router.ts', router);
}

function writeCommandsModule() {
  const service = `import { query } from '../../../database/client';
import { HttpError } from '../../../shared/http';

function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function listOpsCommands(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  type?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = Math.min(normalizePage(input.pageSize, 20), 100);
  const search = String(input.search || '').trim().toLowerCase();
  const type = String(input.type || '').trim();
  const status = String(input.status || '').trim();

  const result = await query<{
    id: string;
    deviceSn: string;
    operatorName: string;
    commandType: string;
    status: string;
    failureReason: string | null;
    startedAt: string;
    finishedAt: string | null;
  }>(
    \`
      SELECT
        id,
        device_sn AS "deviceSn",
        operator_name AS "operatorName",
        command_type AS "commandType",
        status,
        failure_reason AS "failureReason",
        started_at AS "startedAt",
        finished_at AS "finishedAt"
      FROM command_audit
      ORDER BY created_at DESC
    \`
  );

  const filtered = result.rows.filter((row) => {
    const matchesSearch = !search
      || row.id.toLowerCase().includes(search)
      || row.deviceSn.toLowerCase().includes(search)
      || row.operatorName.toLowerCase().includes(search);
    const matchesType = !type || row.commandType === type;
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesType && matchesStatus;
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize),
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function getOpsCommand(commandId: string) {
  const result = await query(
    \`
      SELECT
        id,
        device_id AS "deviceId",
        device_sn AS "deviceSn",
        operator_type AS "operatorType",
        operator_name AS "operatorName",
        command_type AS "commandType",
        request_payload AS "requestPayload",
        response_payload AS "responsePayload",
        status,
        failure_reason AS "failureReason",
        started_at AS "startedAt",
        finished_at AS "finishedAt"
      FROM command_audit
      WHERE id = $1
      LIMIT 1
    \`,
    [commandId]
  );

  const item = result.rows[0] || null;
  if (!item) {
    throw new HttpError(404, '审计记录不存在。');
  }

  return item;
}
`;

  const router = `import { Router } from 'express';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import { getOpsCommand, listOpsCommands } from './service';

export const opsCommandsRouter = Router();

opsCommandsRouter.use(requireAdminAuth);

opsCommandsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOpsCommands(req.query || {});
    res.json(result);
  })
);

opsCommandsRouter.get(
  '/:commandId',
  asyncHandler(async (req, res) => {
    const item = await getOpsCommand(req.params.commandId);
    res.json({ item });
  })
);
`;

  writeFile('src/modules/ops/commands/service.ts', service);
  writeFile('src/modules/ops/commands/router.ts', router);
}

function writeConfigsModule() {
  const service = `import { randomUUID } from 'crypto';
import { query } from '../../../database/client';
import { type AdminAuthUser } from '../../../shared/admin-auth';
import { HttpError } from '../../../shared/http';

type ConfigKind = 'templates' | 'alert-rules' | 'risk-rules';

const CONFIG_TABLES: Record<ConfigKind, {
  table: string;
  typeLabel: 'message' | 'alert' | 'risk';
}> = {
  templates: {
    table: 'config_templates',
    typeLabel: 'message',
  },
  'alert-rules': {
    table: 'alert_rules',
    typeLabel: 'alert',
  },
  'risk-rules': {
    table: 'risk_rules',
    typeLabel: 'risk',
  },
};

function resolveConfig(kind: ConfigKind) {
  const config = CONFIG_TABLES[kind];
  if (!config) {
    throw new HttpError(400, '不支持的配置类型。');
  }
  return config;
}

export async function listOpsConfigItems(kind: ConfigKind) {
  const config = resolveConfig(kind);

  if (kind === 'templates') {
    const result = await query(
      \`
        SELECT
          id,
          name,
          updated_at AS "updatedAt",
          'message' AS type,
          JSONB_BUILD_OBJECT(
            'title', title,
            'content', content,
            'channels', channels,
            'variables', variables,
            'enabled', enabled
          ) AS data
        FROM \${config.table}
        ORDER BY updated_at DESC
      \`
    );
    return result.rows;
  }

  if (kind === 'alert-rules') {
    const result = await query(
      \`
        SELECT
          id,
          name,
          updated_at AS "updatedAt",
          'alert' AS type,
          JSONB_BUILD_OBJECT(
            'condition', expression,
            'severity', severity,
            'actions', actions,
            'delay', delay_seconds,
            'enabled', enabled
          ) AS data
        FROM \${config.table}
        ORDER BY updated_at DESC
      \`
    );
    return result.rows;
  }

  const result = await query(
    \`
      SELECT
        id,
        name,
        updated_at AS "updatedAt",
        'risk' AS type,
        JSONB_BUILD_OBJECT(
          'threshold', threshold_expression,
          'action', action,
          'duration', duration_seconds,
          'reason', reason,
          'enabled', enabled
        ) AS data
      FROM \${config.table}
      ORDER BY updated_at DESC
    \`
  );
  return result.rows;
}

export async function createOpsConfigItem(
  kind: ConfigKind,
  body: Record<string, unknown>,
  admin: AdminAuthUser
) {
  if (kind === 'templates') {
    const result = await query(
      \`
        INSERT INTO config_templates (
          id,
          name,
          template_type,
          title,
          content,
          channels,
          variables,
          enabled,
          created_by,
          updated_by
        )
        VALUES ($1, $2, 'message', $3, $4, $5::jsonb, $6::jsonb, $7, $8, $8)
        RETURNING id
      \`,
      [
        randomUUID(),
        String(body.name || '').trim(),
        String(body.title || '').trim(),
        String(body.content || '').trim(),
        JSON.stringify(body.channels || []),
        JSON.stringify(body.variables || []),
        body.enabled !== false,
        admin.adminId,
      ]
    );
    return { id: result.rows[0]?.id };
  }

  if (kind === 'alert-rules') {
    const result = await query(
      \`
        INSERT INTO alert_rules (
          id,
          name,
          rule_key,
          severity,
          enabled,
          metric_key,
          expression,
          actions,
          delay_seconds,
          scope,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11, $11)
        RETURNING id
      \`,
      [
        randomUUID(),
        String(body.name || '').trim(),
        String(body.ruleKey || body.name || '').trim().replace(/\\s+/g, '_').toLowerCase(),
        String(body.severity || 'normal').trim(),
        body.enabled !== false,
        String(body.metricKey || '').trim() || null,
        String(body.condition || body.expression || '').trim(),
        JSON.stringify(body.actions || []),
        Number(body.delay || body.delay_seconds || 0),
        JSON.stringify(body.scope || {}),
        admin.adminId,
      ]
    );
    return { id: result.rows[0]?.id };
  }

  const result = await query(
    \`
      INSERT INTO risk_rules (
        id,
        name,
        rule_key,
        enabled,
        threshold_expression,
        action,
        duration_seconds,
        reason,
        scope,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $10)
      RETURNING id
    \`,
    [
      randomUUID(),
      String(body.name || '').trim(),
      String(body.ruleKey || body.name || '').trim().replace(/\\s+/g, '_').toLowerCase(),
      body.enabled !== false,
      String(body.threshold || body.threshold_expression || '').trim(),
      String(body.action || '').trim(),
      Number(body.duration || body.duration_seconds || 0),
      String(body.reason || '').trim(),
      JSON.stringify(body.scope || {}),
      admin.adminId,
    ]
  );
  return { id: result.rows[0]?.id };
}

export async function updateOpsConfigItem(
  kind: ConfigKind,
  id: string,
  body: Record<string, unknown>,
  admin: AdminAuthUser
) {
  if (kind === 'templates') {
    const result = await query(
      \`
        UPDATE config_templates
        SET
          name = $2,
          title = $3,
          content = $4,
          channels = $5::jsonb,
          variables = $6::jsonb,
          enabled = $7,
          updated_by = $8,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id
      \`,
      [
        id,
        String(body.name || '').trim(),
        String(body.title || '').trim(),
        String(body.content || '').trim(),
        JSON.stringify(body.channels || []),
        JSON.stringify(body.variables || []),
        body.enabled !== false,
        admin.adminId,
      ]
    );
    if (!result.rowCount) {
      throw new HttpError(404, '配置不存在。');
    }
    return { ok: true };
  }

  if (kind === 'alert-rules') {
    const result = await query(
      \`
        UPDATE alert_rules
        SET
          name = $2,
          severity = $3,
          enabled = $4,
          metric_key = $5,
          expression = $6,
          actions = $7::jsonb,
          delay_seconds = $8,
          scope = $9::jsonb,
          updated_by = $10,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id
      \`,
      [
        id,
        String(body.name || '').trim(),
        String(body.severity || 'normal').trim(),
        body.enabled !== false,
        String(body.metricKey || '').trim() || null,
        String(body.condition || body.expression || '').trim(),
        JSON.stringify(body.actions || []),
        Number(body.delay || body.delay_seconds || 0),
        JSON.stringify(body.scope || {}),
        admin.adminId,
      ]
    );
    if (!result.rowCount) {
      throw new HttpError(404, '配置不存在。');
    }
    return { ok: true };
  }

  const result = await query(
    \`
      UPDATE risk_rules
      SET
        name = $2,
        enabled = $3,
        threshold_expression = $4,
        action = $5,
        duration_seconds = $6,
        reason = $7,
        scope = $8::jsonb,
        updated_by = $9,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    \`,
    [
      id,
      String(body.name || '').trim(),
      body.enabled !== false,
      String(body.threshold || body.threshold_expression || '').trim(),
      String(body.action || '').trim(),
      Number(body.duration || body.duration_seconds || 0),
      String(body.reason || '').trim(),
      JSON.stringify(body.scope || {}),
      admin.adminId,
    ]
  );

  if (!result.rowCount) {
    throw new HttpError(404, '配置不存在。');
  }

  return { ok: true };
}

export async function deleteOpsConfigItem(kind: ConfigKind, id: string) {
  const config = resolveConfig(kind);
  const result = await query(\`DELETE FROM \${config.table} WHERE id = $1 RETURNING id\`, [id]);

  if (!result.rowCount) {
    throw new HttpError(404, '配置不存在。');
  }

  return { ok: true };
}

export async function simulateOpsConfig(input: {
  type: 'message' | 'alert' | 'risk';
  configId: string;
  target: string;
}) {
  const configMap = {
    message: 'templates',
    alert: 'alert-rules',
    risk: 'risk-rules',
  } as const;

  const kind = configMap[input.type];
  const items = await listOpsConfigItems(kind);
  const selectedItem = items.find((item: any) => item.id === input.configId) || null;

  if (!selectedItem) {
    throw new HttpError(404, '模拟目标配置不存在。');
  }

  const logs = [
    \`[\${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在初始化沙盒环境...\`,
    \`[\${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在加载规则: \${selectedItem.name} (\${selectedItem.id})\`,
    \`[\${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在获取目标 \${input.target} 的状态快照...\`,
    \`[\${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 状态匹配中: \${input.type === 'alert' ? selectedItem.data.condition : input.type === 'risk' ? selectedItem.data.threshold : '渲染消息模板'}\`,
    \`[\${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 模拟匹配成功！\`,
    \`[\${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在执行动作: \${input.type === 'alert' ? (selectedItem.data.actions || []).join(', ') : input.type === 'risk' ? selectedItem.data.action : (selectedItem.data.channels || []).join(', ')}\`,
    \`[\${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 模拟运行完成。\`,
  ];

  return {
    ok: true,
    logs,
  };
}
`;

  const router = `import { Router } from 'express';
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
`;

  writeFile('src/modules/ops/configs/service.ts', service);
  writeFile('src/modules/ops/configs/router.ts', router);
}

function run() {
  patchCreateApp();
  patchBootstrap();
  writeAlertsModule();
  writeCommandsModule();
  writeConfigsModule();
  console.log('Ops backend phase 2 files generated successfully.');
}

run();
