import { randomUUID } from 'crypto';
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
      `
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
        FROM ${config.table}
        ORDER BY updated_at DESC
      `
    );
    return result.rows;
  }

  if (kind === 'alert-rules') {
    const result = await query(
      `
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
        FROM ${config.table}
        ORDER BY updated_at DESC
      `
    );
    return result.rows;
  }

  const result = await query(
    `
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
      FROM ${config.table}
      ORDER BY updated_at DESC
    `
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
      `
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
      `,
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
      `
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
      `,
      [
        randomUUID(),
        String(body.name || '').trim(),
        String(body.ruleKey || body.name || '').trim().replace(/\s+/g, '_').toLowerCase(),
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
    `
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
    `,
    [
      randomUUID(),
      String(body.name || '').trim(),
      String(body.ruleKey || body.name || '').trim().replace(/\s+/g, '_').toLowerCase(),
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
      `
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
      `,
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
      `
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
      `,
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
    `
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
    `,
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
  const result = await query(`DELETE FROM ${config.table} WHERE id = $1 RETURNING id`, [id]);

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
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在初始化沙盒环境...`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在加载规则: ${selectedItem.name} (${selectedItem.id})`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在获取目标 ${input.target} 的状态快照...`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 状态匹配中: ${input.type === 'alert' ? selectedItem.data.condition : input.type === 'risk' ? selectedItem.data.threshold : '渲染消息模板'}`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 模拟匹配成功！`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 正在执行动作: ${input.type === 'alert' ? (selectedItem.data.actions || []).join(', ') : input.type === 'risk' ? selectedItem.data.action : (selectedItem.data.channels || []).join(', ')}`,
    `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] 模拟运行完成。`,
  ];

  return {
    ok: true,
    logs,
  };
}
