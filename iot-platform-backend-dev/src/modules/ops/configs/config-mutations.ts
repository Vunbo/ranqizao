import { randomUUID } from 'crypto';
import { query } from '../../../db/client';
import { type AdminAuthUser } from '../../../shared/admin-auth';
import { HttpError } from '../../../shared/http';
import type { ConfigKind } from './config.types';

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
