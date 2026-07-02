import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { env } from '../../config/env';

export async function ensureDefaultUser(mainPool: Pool) {
  const defaultEmail = '123@test.com';
  const defaultPasswordHash = await bcrypt.hash('admin@123', 10);
  const existingUser = await mainPool.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [defaultEmail]
  );

  let userId = existingUser.rows[0]?.id;

  if (userId) {
    await mainPool.query(
      `
        UPDATE users
        SET
          display_name = $2,
          password_hash = COALESCE(password_hash, $3),
          primary_email = COALESCE(primary_email, $1),
          updated_at = NOW()
        WHERE email = $1
      `,
      [defaultEmail, '默认账号', defaultPasswordHash]
    );
  } else {
    const inserted = await mainPool.query<{ id: string }>(
      `
        INSERT INTO users (
          id,
          short_uid,
          email,
          display_name,
          password_hash,
          primary_email,
          photo_url,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        RETURNING id
      `,
      [
        randomUUID(),
        '123test0',
        defaultEmail,
        '默认账号',
        defaultPasswordHash,
        defaultEmail,
        null,
      ]
    );

    userId = inserted.rows[0]?.id;
  }

  if (!userId) {
    throw new Error('Failed to ensure default user.');
  }

  await mainPool.query(
    `
      INSERT INTO auth_identities (
        id,
        user_pk,
        provider,
        provider_user_id,
        provider_app_id,
        password_hash,
        is_verified,
        is_primary
      )
      VALUES ($1, $2, 'email_password', $3, '', $4, TRUE, TRUE)
      ON CONFLICT (provider, provider_user_id, provider_app_id)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        is_verified = TRUE,
        is_primary = TRUE,
        updated_at = NOW()
    `,
    [randomUUID(), userId, defaultEmail, defaultPasswordHash]
  );
}

export async function ensureDefaultAdminUser(mainPool: Pool) {
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
      `
        UPDATE admin_users
        SET
          display_name = $2,
          role = 'super_admin',
          status = 'active',
          password_hash = COALESCE(password_hash, $3),
          updated_at = NOW()
        WHERE username = $1
      `,
      [defaultUsername, defaultDisplayName, defaultPasswordHash]
    );
  } else {
    const inserted = await mainPool.query<{ id: string }>(
      `
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
      `,
      [randomUUID(), defaultUsername, defaultPasswordHash, defaultDisplayName]
    );

    adminId = inserted.rows[0]?.id;
  }

  if (!adminId) {
    throw new Error('Failed to ensure default admin user.');
  }
}

export async function ensureDefaultOpsConfigs(mainPool: Pool) {
  const adminResult = await mainPool.query<{ id: string }>(
    'SELECT id FROM admin_users ORDER BY created_at ASC LIMIT 1'
  );
  const adminId = adminResult.rows[0]?.id || null;

  const templateExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM config_templates) AS "exists"'
  );
  if (!templateExists.rows[0]?.exists) {
    await mainPool.query(
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
        VALUES
          ($1, $2, 'message', $3, $4, $5::jsonb, $6::jsonb, TRUE, $7, $7),
          ($8, $9, 'message', $10, $11, $12::jsonb, $13::jsonb, TRUE, $7, $7)
      `,
      [
        randomUUID(),
        '燃气泄漏紧急通知',
        '燃气泄漏预警',
        '尊敬的用户，您的设备 ${deviceId} 检测到燃气浓度异常（${value}），系统已自动关闭阀门，请立即检查。',
        JSON.stringify(['sms', 'app']),
        JSON.stringify(['deviceId', 'value']),
        adminId,
        randomUUID(),
        '设备离线提醒',
        '设备连接断开',
        '您的设备 ${deviceId} 已离线超过 30 分钟，请检查网络连接。',
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
        VALUES
          ($1, $2, $3, 'critical', TRUE, 'gas', $4, $5::jsonb, 0, $6::jsonb, $7, $7),
          ($8, $9, $10, 'high', TRUE, 'temp', $11, $12::jsonb, 5, $13::jsonb, $7, $7)
      `,
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
        VALUES
          ($1, $2, $3, TRUE, $4, $5, $6, $7, $8::jsonb, $9, $9)
      `,
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

export async function ensureDefaultOpsRecords(mainPool: Pool) {
  const adminResult = await mainPool.query<{ id: string; displayName: string }>(
    `
      SELECT id, display_name AS "displayName"
      FROM admin_users
      ORDER BY created_at ASC
      LIMIT 1
    `
  );
  const admin = adminResult.rows[0] || null;

  const deviceRows = await mainPool.query<{
    id: string;
    sn: string | null;
    ownerUid: string;
  }>(
    `
      SELECT
        d.id,
        COALESCE(d.serial_number, di.serial_number) AS sn,
        d.owner_id AS "ownerUid"
      FROM devices d
      LEFT JOIN device_inventory di
        ON di.id = d.inventory_id
      ORDER BY d.created_at ASC
      LIMIT 3
    `
  );

  const alertsExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM alerts) AS "exists"'
  );

  if (!alertsExists.rows[0]?.exists && deviceRows.rows.length) {
    const firstDevice = deviceRows.rows[0];
    const secondDevice = deviceRows.rows[1] || deviceRows.rows[0];

    await mainPool.query(
      `
        INSERT INTO alerts (
          id,
          device_id,
          device_sn,
          owner_uid,
          type,
          level,
          status,
          title,
          message,
          metric_key,
          current_value,
          threshold_value,
          handler_admin_id,
          handler_comment,
          is_false_positive,
          triggered_at,
          resolved_at,
          detail
        )
        VALUES
          (
            $1, $2, $3, $4,
            'gas_leak', 'critical', 'pending',
            '燃气泄漏预警',
            '燃气浓度超标 (0.15%LEL)，已自动关阀',
            'gas', 0.15, 0.10,
            NULL, NULL, FALSE,
            NOW() - INTERVAL '5 minutes',
            NULL,
            $5::jsonb
          ),
          (
            $6, $7, $8, $9,
            'dry_burn', 'high', 'resolved',
            '干烧保护触发',
            '检测到锅具干烧，温度 285℃，已切断火力',
            'temp', 285, 280,
            $10, '已人工确认并处理', FALSE,
            NOW() - INTERVAL '2 hours',
            NOW() - INTERVAL '90 minutes',
            $11::jsonb
          )
      `,
      [
        randomUUID(),
        firstDevice.id,
        firstDevice.sn || '',
        firstDevice.ownerUid,
        JSON.stringify({ source: 'bootstrap_seed' }),
        randomUUID(),
        secondDevice.id,
        secondDevice.sn || '',
        secondDevice.ownerUid,
        admin?.id || null,
        JSON.stringify({ source: 'bootstrap_seed' }),
      ]
    );
  }

  const commandsExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM command_audit) AS "exists"'
  );

  if (!commandsExists.rows[0]?.exists && deviceRows.rows.length) {
    const firstDevice = deviceRows.rows[0];
    const secondDevice = deviceRows.rows[1] || deviceRows.rows[0];

    await mainPool.query(
      `
        INSERT INTO command_audit (
          id,
          device_id,
          device_sn,
          operator_type,
          operator_admin_id,
          operator_user_uid,
          operator_name,
          command_type,
          request_payload,
          response_payload,
          status,
          failure_reason,
          started_at,
          finished_at
        )
        VALUES
          (
            $1, $2, $3,
            'admin', $4, NULL, $5,
            'lock_device',
            $6::jsonb,
            $7::jsonb,
            'success', NULL,
            NOW() - INTERVAL '30 minutes',
            NOW() - INTERVAL '29 minutes'
          ),
          (
            $8, $9, $10,
            'system', NULL, NULL, '系统',
            'ota_upgrade',
            $11::jsonb,
            NULL,
            'pending', NULL,
            NOW() - INTERVAL '10 minutes',
            NULL
          )
      `,
      [
        randomUUID(),
        firstDevice.id,
        firstDevice.sn || '',
        admin?.id || null,
        admin?.displayName || '超级管理员',
        JSON.stringify({ command: 'lock_device' }),
        JSON.stringify({ ok: true }),
        randomUUID(),
        secondDevice.id,
        secondDevice.sn || '',
        JSON.stringify({ command: 'ota_upgrade' }),
      ]
    );
  }
}

export async function backfillPrimaryEmails(mainPool: Pool) {
  await mainPool.query(`
    UPDATE users
    SET
      primary_email = COALESCE(primary_email, email),
      updated_at = NOW()
    WHERE email IS NOT NULL
      AND primary_email IS NULL;
  `);
}

export async function backfillEmailPasswordIdentities(mainPool: Pool) {
  await mainPool
    .query(`
      INSERT INTO auth_identities (
        id,
        user_pk,
        provider,
        provider_user_id,
        provider_app_id,
        password_hash,
        is_verified,
        is_primary
      )
      SELECT
        gen_random_uuid()::text,
        u.id,
        'email_password',
        lower(u.email),
        '',
        u.password_hash,
        TRUE,
        TRUE
      FROM users u
      WHERE u.email IS NOT NULL
        AND u.password_hash IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM auth_identities ai
          WHERE ai.provider = 'email_password'
            AND ai.provider_user_id = lower(u.email)
            AND ai.provider_app_id = ''
        );
    `)
    .catch(async () => {
      const rows = await mainPool.query<{
        id: string;
        email: string;
        password_hash: string;
      }>(
        `
          SELECT id, email, password_hash
          FROM users
          WHERE email IS NOT NULL AND password_hash IS NOT NULL
        `
      );

      for (const row of rows.rows) {
        await mainPool.query(
          `
            INSERT INTO auth_identities (
              id,
              user_pk,
              provider,
              provider_user_id,
              provider_app_id,
              password_hash,
              is_verified,
              is_primary
            )
            VALUES ($1, $2, 'email_password', $3, '', $4, TRUE, TRUE)
            ON CONFLICT (provider, provider_user_id, provider_app_id) DO NOTHING
          `,
          [randomUUID(), row.id, row.email.toLowerCase(), row.password_hash]
        );
      }
    });
}

export async function ensureWechatAuthIdentities(
  mainPool: Pool,
  appId: string
) {
  const wechatUsers = await mainPool.query<{
    id: string;
    wechat_openid: string | null;
    wechat_unionid: string | null;
  }>(
    `
      SELECT id, wechat_openid, wechat_unionid
      FROM users
      WHERE wechat_openid IS NOT NULL
    `
  );

  for (const row of wechatUsers.rows) {
    await mainPool.query(
      `
        INSERT INTO auth_identities (
          id,
          user_pk,
          provider,
          provider_user_id,
          provider_app_id,
          union_id,
          is_verified,
          is_primary,
          meta
        )
        VALUES (
          $1,
          $2,
          'wechat_mini_program',
          $3,
          $4,
          $5,
          TRUE,
          FALSE,
          $6::jsonb
        )
        ON CONFLICT (provider, provider_user_id, provider_app_id) DO NOTHING
      `,
      [
        randomUUID(),
        row.id,
        row.wechat_openid,
        appId,
        row.wechat_unionid,
        JSON.stringify({
          openid: row.wechat_openid,
          unionid: row.wechat_unionid,
        }),
      ]
    );
  }
}

export async function ensureDeviceSeed(
  mainPool: Pool,
  options: { createId: () => string }
) {
  const deviceExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM devices) AS "exists"'
  );

  if (deviceExists.rows[0]?.exists) {
    return;
  }

  const firstUser = await mainPool.query<{ short_uid: string }>(
    'SELECT short_uid FROM users ORDER BY created_at ASC LIMIT 1'
  );

  if (!firstUser.rows[0]?.short_uid) {
    return;
  }

  await mainPool.query(
    `
      INSERT INTO devices (
        id,
        name,
        owner_id,
        is_on,
        fire_level,
        temp,
        gas,
        smoke,
        flow,
        human_detected,
        vibration
      )
      VALUES ($1, $2, $3, FALSE, 60, 25, 0.05, 2, 0, FALSE, FALSE)
      ON CONFLICT (id) DO NOTHING
    `,
    [options.createId(), '智能安全灶', firstUser.rows[0].short_uid]
  );
}

export async function ensureInventorySeed(
  mainPool: Pool,
  options: { createId: () => string }
) {
  const inventoryExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM device_inventory) AS "exists"'
  );

  if (inventoryExists.rows[0]?.exists) {
    return;
  }

  await mainPool.query(
    `
      INSERT INTO device_inventory (
        id,
        qr_code,
        serial_number,
        product_model,
        firmware_version,
        status
      )
      VALUES
        ($1, $2, $3, $4, $5, 'available'),
        ($6, $7, $8, $9, $10, 'available'),
        ($11, $12, $13, $14, $15, 'available')
      ON CONFLICT (qr_code) DO NOTHING
    `,
    [
      options.createId(),
      'STOVE-QR-001',
      'SN-AI-STOVE-001',
      'AI 安全灶 Pro',
      '1.0.0',
      options.createId(),
      'STOVE-QR-002',
      'SN-AI-STOVE-002',
      'AI 安全灶 Pro',
      '1.0.0',
      options.createId(),
      'STOVE-QR-003',
      'SN-AI-STOVE-003',
      'AI 安全灶 Lite',
      '1.0.0',
    ]
  );
}
