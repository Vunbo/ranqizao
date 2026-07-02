import { query, type DatabaseExecutor } from '../../../db/client';

export interface OpsDeviceRow {
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

export const poolExecutor: DatabaseExecutor = {
  query,
};

export const OPS_DEVICE_SELECT_SQL = `
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

export async function listOpsDeviceRows() {
  const result = await query<OpsDeviceRow>(
    `${OPS_DEVICE_SELECT_SQL}
      ORDER BY d.updated_at DESC
    `
  );

  return result.rows;
}

export async function getOpsDeviceRow(
  deviceId: string,
  executor: DatabaseExecutor = poolExecutor,
  forUpdate = false
) {
  const result = await executor.query<OpsDeviceRow>(
    `${OPS_DEVICE_SELECT_SQL}
      WHERE d.id = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [deviceId]
  );

  return result.rows[0] || null;
}

export async function listOpsDeviceSharedUsers(deviceId: string) {
  const result = await query<{ uid: string; displayName: string }>(
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

  return result.rows;
}

export async function listOpsDeviceHomes(deviceId: string) {
  const result = await query<{ id: string; name: string }>(
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

  return result.rows;
}

export async function listOpsDeviceCommandsByDeviceId(deviceId: string) {
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

export async function listOpsDeviceAlertsByDeviceId(deviceId: string) {
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
