import fs from 'fs';
import path from 'path';

const backendRoot = 'D:\\Desktop\\ranqizao\\iot-platform-backend-dev';

function replaceOrThrow(source, searchValue, replaceValue, label) {
  if (!source.includes(searchValue)) {
    throw new Error(`Patch anchor not found: ${label}`);
  }

  return source.replace(searchValue, replaceValue);
}

function patchBootstrap() {
  const filePath = path.join(backendRoot, 'src/database/bootstrap.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('async function ensureDefaultOpsRecords')) {
    const fn = `
async function ensureDefaultOpsRecords(mainPool: Pool) {
  const adminResult = await mainPool.query<{ id: string; displayName: string }>(
    \`
      SELECT id, display_name AS "displayName"
      FROM admin_users
      ORDER BY created_at ASC
      LIMIT 1
    \`
  );
  const admin = adminResult.rows[0] || null;

  const deviceRows = await mainPool.query<{
    id: string;
    sn: string | null;
    ownerUid: string;
  }>(
    \`
      SELECT
        d.id,
        COALESCE(d.serial_number, di.serial_number) AS sn,
        d.owner_id AS "ownerUid"
      FROM devices d
      LEFT JOIN device_inventory di
        ON di.id = d.inventory_id
      ORDER BY d.created_at ASC
      LIMIT 3
    \`
  );

  const alertsExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM alerts) AS "exists"'
  );

  if (!alertsExists.rows[0]?.exists && deviceRows.rows.length) {
    const firstDevice = deviceRows.rows[0];
    const secondDevice = deviceRows.rows[1] || deviceRows.rows[0];

    await mainPool.query(
      \`
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
      \`,
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
      \`
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
      \`,
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

`;
    content = replaceOrThrow(
      content,
      'async function ensureSchema(mainPool: Pool) {',
      `${fn}async function ensureSchema(mainPool: Pool) {`,
      'insert ensureDefaultOpsRecords'
    );
  }

  if (!content.includes('await ensureDefaultOpsRecords(mainPool);')) {
    content = replaceOrThrow(
      content,
      '  await ensureDefaultUser(mainPool);\n  await ensureDefaultAdminUser(mainPool);\n  await ensureDefaultOpsConfigs(mainPool);\n',
      '  await ensureDefaultUser(mainPool);\n  await ensureDefaultAdminUser(mainPool);\n  await ensureDefaultOpsConfigs(mainPool);\n  await ensureDefaultOpsRecords(mainPool);\n',
      'call ensureDefaultOpsRecords'
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function patchOpsDevicesService() {
  const filePath = path.join(backendRoot, 'src/modules/ops/devices/service.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes("import { withTransaction }")) {
    content = replaceOrThrow(
      content,
      "import { query } from '../../../database/client';\n",
      "import { query, withTransaction } from '../../../database/client';\n",
      'add withTransaction import'
    );
  }

  if (!content.includes('export async function controlOpsDevice')) {
    const fn = `
export async function controlOpsDevice(input: {
  deviceId: string;
  adminId: string;
  adminName: string;
  command: string;
  reason?: string;
}) {
  const command = String(input.command || '').trim();
  const reason = String(input.reason || '').trim();

  const result = await withTransaction(async (executor) => {
    const deviceResult = await executor.query<OpsDeviceRow>(
      \`\${OPS_DEVICE_SELECT_SQL}
        WHERE d.id = $1
        LIMIT 1
        FOR UPDATE
      \`,
      [input.deviceId]
    );

    const row = deviceResult.rows[0] || null;
    if (!row) {
      throw new HttpError(404, '设备不存在。');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (command === 'lock_device') {
      updates.push(\`locked = $1\`);
      values.push(true);
    } else if (command === 'unlock_device') {
      updates.push(\`locked = $1\`);
      values.push(false);
    } else if (command === 'ignite') {
      updates.push(\`is_on = $1\`, \`fire_level = $2\`, \`valve_status = $3\`);
      values.push(true, row.fireLevel > 0 ? row.fireLevel : 60, 'open');
    } else if (command === 'shutdown') {
      updates.push(\`is_on = $1\`, \`fire_level = $2\`, \`valve_status = $3\`);
      values.push(false, 0, 'closed');
    } else {
      throw new HttpError(400, '不支持的控制指令。');
    }

    await executor.query(
      \`
        UPDATE devices
        SET \${updates.join(', ')}, updated_at = NOW()
        WHERE id = $\${values.length + 1}
      \`,
      [...values, input.deviceId]
    );

    await executor.query(
      \`
        INSERT INTO command_audit (
          id,
          device_id,
          device_sn,
          operator_type,
          operator_admin_id,
          operator_name,
          command_type,
          request_payload,
          response_payload,
          status,
          failure_reason,
          started_at,
          finished_at
        )
        VALUES (
          $1, $2, $3,
          'admin', $4, $5,
          $6, $7::jsonb, $8::jsonb,
          'success', NULL, NOW(), NOW()
        )
      \`,
      [
        randomUUID(),
        row.id,
        row.sn || '',
        input.adminId,
        input.adminName,
        command,
        JSON.stringify({ command, reason }),
        JSON.stringify({ ok: true }),
      ]
    );

    await executor.query(
      \`
        INSERT INTO operation_logs (id, stove_id, owner_id, event, type)
        VALUES ($1, $2, $3, $4, 'success')
      \`,
      [
        randomUUID(),
        row.id,
        row.ownerUid,
        \`运维控制：\${command}\${reason ? \`（\${reason}）\` : ''}\`,
      ]
    );

    return true;
  });

  return { ok: result };
}
`;
    content += fn;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function patchOpsDevicesRouter() {
  const filePath = path.join(backendRoot, 'src/modules/ops/devices/router.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('controlOpsDevice')) {
    content = replaceOrThrow(
      content,
      "import {\n  getOpsDevice,\n  getOpsDeviceAlerts,\n  getOpsDeviceCommands,\n  getOpsDeviceRealtimeMetrics,\n  listOpsDevices,\n} from './service';\n",
      "import {\n  controlOpsDevice,\n  getOpsDevice,\n  getOpsDeviceAlerts,\n  getOpsDeviceCommands,\n  getOpsDeviceRealtimeMetrics,\n  listOpsDevices,\n} from './service';\n",
      'add controlOpsDevice import'
    );
  }

  if (!content.includes("opsDevicesRouter.post(\n  '/:deviceId/control'")) {
    content += `

opsDevicesRouter.post(
  '/:deviceId/control',
  asyncHandler(async (req, res) => {
    const result = await controlOpsDevice({
      deviceId: req.params.deviceId,
      adminId: (req as import('../../../shared/admin-auth').AdminAuthenticatedRequest).admin!.adminId,
      adminName: (req as import('../../../shared/admin-auth').AdminAuthenticatedRequest).admin!.displayName,
      command: String(req.body?.command || ''),
      reason: String(req.body?.reason || ''),
    });
    res.json(result);
  })
);
`;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

patchBootstrap();
patchOpsDevicesService();
patchOpsDevicesRouter();
console.log('Ops backend phase 3 files generated successfully.');
