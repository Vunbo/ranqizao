import { randomUUID } from 'crypto';
import { query, withTransaction } from '../../../database/client';
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

const OPS_DEVICE_SELECT_SQL = `
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
`;

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
    `${OPS_DEVICE_SELECT_SQL}
      ORDER BY d.updated_at DESC
    `
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
    `${OPS_DEVICE_SELECT_SQL}
      WHERE d.id = $1
      LIMIT 1
    `,
    [deviceId]
  );

  const row = result.rows[0] || null;
  if (!row) {
    throw new HttpError(404, '设备不存在。');
  }

  const device = mapDeviceRowToView(row);

  const sharedUsersResult = await query<{ uid: string; displayName: string }>(
    `
      SELECT
        u.short_uid AS uid,
        u.display_name AS "displayName"
      FROM device_shares ds
      INNER JOIN users u
        ON u.short_uid = ds.user_id
      WHERE ds.device_id = $1
      ORDER BY ds.created_at DESC
    `,
    [deviceId]
  );

  const homeLinksResult = await query<{ id: string; name: string }>(
    `
      SELECT
        h.id,
        h.name
      FROM home_device_links hdl
      INNER JOIN homes h
        ON h.id = hdl.home_id
      WHERE hdl.device_id = $1
      ORDER BY h.created_at DESC
    `,
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
    `
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
    `,
    [deviceId]
  );

  return result.rows;
}

export async function getOpsDeviceAlerts(deviceId: string) {
  const result = await query(
    `
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
    `,
    [deviceId]
  );

  return result.rows;
}

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
      `${OPS_DEVICE_SELECT_SQL}
        WHERE d.id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [input.deviceId]
    );

    const row = deviceResult.rows[0] || null;
    if (!row) {
      throw new HttpError(404, '设备不存在。');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (command === 'lock_device') {
      updates.push(`locked = $1`);
      values.push(true);
    } else if (command === 'unlock_device') {
      updates.push(`locked = $1`);
      values.push(false);
    } else if (command === 'ignite') {
      updates.push(`is_on = $1`, `fire_level = $2`, `valve_status = $3`);
      values.push(true, row.fireLevel > 0 ? row.fireLevel : 60, 'open');
    } else if (command === 'shutdown') {
      updates.push(`is_on = $1`, `fire_level = $2`, `valve_status = $3`);
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

