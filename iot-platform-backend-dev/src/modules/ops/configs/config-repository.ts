import { query } from '../../../db/client';
import { HttpError } from '../../../shared/http';
import type { ConfigKind } from './config.types';

const CONFIG_TABLES: Record<
  ConfigKind,
  {
    table: string;
    typeLabel: 'message' | 'alert' | 'risk';
  }
> = {
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

export function resolveConfig(kind: ConfigKind) {
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

export async function deleteOpsConfigItem(kind: ConfigKind, id: string) {
  const config = resolveConfig(kind);
  const result = await query(`DELETE FROM ${config.table} WHERE id = $1 RETURNING id`, [id]);

  if (!result.rowCount) {
    throw new HttpError(404, '配置不存在。');
  }

  return { ok: true };
}
