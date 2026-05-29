import { randomUUID } from 'crypto';
import { withTransaction } from '../../../database/client';
import { HttpError } from '../../../shared/http';
import { getOpsDeviceRow } from './device-repository';

export async function controlOpsDeviceByAdmin(input: {
  deviceId: string;
  adminId: string;
  adminName: string;
  command: string;
  reason?: string;
}) {
  const command = String(input.command || '').trim();
  const reason = String(input.reason || '').trim();

  const result = await withTransaction(async (executor) => {
    const row = await getOpsDeviceRow(input.deviceId, executor, true);
    if (!row) {
      throw new HttpError(404, '设备不存在。');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (command === 'lock_device') {
      updates.push('locked = $1');
      values.push(true);
    } else if (command === 'unlock_device') {
      updates.push('locked = $1');
      values.push(false);
    } else if (command === 'ignite') {
      updates.push('is_on = $1', 'fire_level = $2', 'valve_status = $3');
      values.push(true, row.fireLevel > 0 ? row.fireLevel : 60, 'open');
    } else if (command === 'shutdown') {
      updates.push('is_on = $1', 'fire_level = $2', 'valve_status = $3');
      values.push(false, 0, 'closed');
    } else {
      throw new HttpError(400, '不支持的控制指令。');
    }

    await executor.query(
      `
        UPDATE devices
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${values.length + 1}
      `,
      [...values, input.deviceId]
    );

    await executor.query(
      `
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
      `,
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
      `
        INSERT INTO operation_logs (id, stove_id, owner_id, event, type)
        VALUES ($1, $2, $3, $4, 'success')
      `,
      [
        randomUUID(),
        row.id,
        row.ownerUid,
        `运维控制：${command}${reason ? `（${reason}）` : ''}`,
      ]
    );

    return true;
  });

  return { ok: result };
}
