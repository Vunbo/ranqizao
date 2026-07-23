import { randomUUID } from 'crypto';
import { query, type DatabaseExecutor } from '../../db/client';
import type {
  DeviceIotLinkRow,
  DeviceRuntimeStateRow,
  InventoryCloudIdentity,
  ParsedRuntimeState,
} from './types';

export const poolExecutor: DatabaseExecutor = {
  query,
};

const DEVICE_IOT_LINK_SELECT_SQL = `
  SELECT
    d.id,
    d.name,
    d.owner_id AS "ownerId",
    d.inventory_id AS "inventoryId",
    d.serial_number AS "serialNumber",
    d.fire_level AS "legacyFireLevel",
    di.node_id AS "inventoryNodeId",
    di.imei AS "inventoryImei",
    di.product_code AS "productCode",
    di.burner_count AS "burnerCount",
    dcr.id AS "cloudRegistryId",
    dcr.cloud_device_id AS "cloudDeviceId",
    dcr.node_id AS "cloudNodeId",
    dcr.provision_status AS "cloudStatus",
    dcr.resource_space_id AS "resourceSpaceId",
    dcr.product_id AS "productId",
    drs.service_id AS "serviceId",
    drs.reported_properties AS "reportedProperties",
    drs.desired_properties AS "desiredProperties",
    drs.summary AS "runtimeSummary",
    drs.updated_at AS "runtimeUpdatedAt"
  FROM devices d
  LEFT JOIN device_inventory di
    ON di.id = d.inventory_id
  LEFT JOIN device_cloud_registry dcr
    ON dcr.inventory_id = d.inventory_id
  LEFT JOIN device_runtime_state drs
    ON drs.device_id = d.id
`;

export async function getInventoryCloudIdentityById(
  inventoryId: string,
  executor: DatabaseExecutor = poolExecutor
) {
  const result = await executor.query<InventoryCloudIdentity>(
    `
      SELECT
        id,
        qr_code AS "qrCode",
        serial_number AS "serialNumber",
        product_model AS "productModel",
        firmware_version AS "firmwareVersion",
        status,
        node_id AS "nodeId",
        imei,
        product_code AS "productCode",
        burner_count AS "burnerCount"
      FROM device_inventory
      WHERE id = $1
      LIMIT 1
    `,
    [inventoryId]
  );

  return result.rows[0] || null;
}

export async function getInventoryCloudIdentityByNodeIdentifier(
  identifier: string,
  executor: DatabaseExecutor = poolExecutor
) {
  const result = await executor.query<InventoryCloudIdentity>(
    `
      SELECT
        id,
        qr_code AS "qrCode",
        serial_number AS "serialNumber",
        product_model AS "productModel",
        firmware_version AS "firmwareVersion",
        status,
        node_id AS "nodeId",
        imei,
        product_code AS "productCode",
        burner_count AS "burnerCount"
      FROM device_inventory
      WHERE node_id = $1 OR imei = $1 OR serial_number = $1
      LIMIT 1
    `,
    [identifier]
  );

  return result.rows[0] || null;
}

export async function getDeviceIotLinkByDeviceId(
  deviceId: string,
  executor: DatabaseExecutor = poolExecutor
) {
  const result = await executor.query<DeviceIotLinkRow>(
    `
      ${DEVICE_IOT_LINK_SELECT_SQL}
      WHERE d.id = $1
      LIMIT 1
    `,
    [deviceId]
  );

  return result.rows[0] || null;
}

export async function getDeviceIotLinkByInventoryId(
  inventoryId: string,
  executor: DatabaseExecutor = poolExecutor
) {
  const result = await executor.query<DeviceIotLinkRow>(
    `
      ${DEVICE_IOT_LINK_SELECT_SQL}
      WHERE d.inventory_id = $1
      LIMIT 1
    `,
    [inventoryId]
  );

  return result.rows[0] || null;
}

export async function getDeviceIotLinkByCloudIdentity(
  input: {
    cloudDeviceId?: string | null;
    nodeId?: string | null;
  },
  executor: DatabaseExecutor = poolExecutor
) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (input.cloudDeviceId) {
    values.push(input.cloudDeviceId);
    conditions.push(`dcr.cloud_device_id = $${values.length}`);
  }

  if (input.nodeId) {
    values.push(input.nodeId);
    const placeholder = `$${values.length}`;
    conditions.push(`(
      dcr.node_id = ${placeholder}
      OR di.node_id = ${placeholder}
      OR di.imei = ${placeholder}
      OR d.serial_number = ${placeholder}
    )`);
  }

  if (!conditions.length) {
    return null;
  }

  const result = await executor.query<DeviceIotLinkRow>(
    `
      ${DEVICE_IOT_LINK_SELECT_SQL}
      WHERE ${conditions.join(' OR ')}
      LIMIT 1
    `,
    values
  );

  return result.rows[0] || null;
}

export async function getDeviceRuntimeStateByDeviceId(
  deviceId: string,
  executor: DatabaseExecutor = poolExecutor
) {
  const result = await executor.query<DeviceRuntimeStateRow>(
    `
      SELECT
        device_id AS "deviceId",
        cloud_device_id AS "cloudDeviceId",
        service_id AS "serviceId",
        cloud_status AS "cloudStatus",
        reported_properties AS "reportedProperties",
        desired_properties AS "desiredProperties",
        summary,
        run_state AS "runState",
        heat_temp AS "heatTemp",
        room_temp AS "roomTemp",
        fuel_consumption AS "fuelConsumption",
        error_code AS "errorCode",
        position,
        reported_at AS "reportedAt",
        last_seen_at AS "lastSeenAt",
        updated_at AS "updatedAt"
      FROM device_runtime_state
      WHERE device_id = $1
      LIMIT 1
    `,
    [deviceId]
  );

  return result.rows[0] || null;
}

export async function upsertDeviceCloudRegistry(
  executor: DatabaseExecutor,
  input: {
    inventoryId: string;
    deviceId?: string | null;
    resourceSpaceId: string | null;
    productId: string | null;
    cloudDeviceId: string;
    nodeId: string | null;
    authType: string;
    provisionMode: string;
    provisionStatus: string;
    cloudDeviceName: string | null;
    activatedAt: string | null;
    lastSeenAt: string | null;
    meta: Record<string, unknown>;
  }
) {
  const id = randomUUID();

  await executor.query(
    `
      INSERT INTO device_cloud_registry (
        id,
        inventory_id,
        device_id,
        provider,
        resource_space_id,
        product_id,
        cloud_device_id,
        node_id,
        auth_type,
        provision_mode,
        provision_status,
        cloud_device_name,
        activated_at,
        last_seen_at,
        last_sync_at,
        meta
      )
      VALUES (
        $1, $2, $3, 'huawei_iotda', $4, $5, $6, $7, $8, $9, $10, $11,
        $12::timestamptz, $13::timestamptz, NOW(), $14::jsonb
      )
      ON CONFLICT (inventory_id) DO UPDATE SET
        device_id = COALESCE(EXCLUDED.device_id, device_cloud_registry.device_id),
        resource_space_id = EXCLUDED.resource_space_id,
        product_id = EXCLUDED.product_id,
        cloud_device_id = EXCLUDED.cloud_device_id,
        node_id = EXCLUDED.node_id,
        auth_type = EXCLUDED.auth_type,
        provision_mode = EXCLUDED.provision_mode,
        provision_status = EXCLUDED.provision_status,
        cloud_device_name = COALESCE(EXCLUDED.cloud_device_name, device_cloud_registry.cloud_device_name),
        activated_at = COALESCE(EXCLUDED.activated_at, device_cloud_registry.activated_at),
        last_seen_at = COALESCE(EXCLUDED.last_seen_at, device_cloud_registry.last_seen_at),
        last_sync_at = NOW(),
        meta = EXCLUDED.meta,
        updated_at = NOW()
    `,
    [
      id,
      input.inventoryId,
      input.deviceId || null,
      input.resourceSpaceId,
      input.productId,
      input.cloudDeviceId,
      input.nodeId,
      input.authType,
      input.provisionMode,
      input.provisionStatus,
      input.cloudDeviceName,
      input.activatedAt,
      input.lastSeenAt,
      JSON.stringify(input.meta || {}),
    ]
  );
}

export async function upsertDeviceRuntimeState(
  executor: DatabaseExecutor,
  input: {
    deviceId: string;
    cloudDeviceId: string;
    runtime: ParsedRuntimeState;
  }
) {
  await executor.query(
    `
      INSERT INTO device_runtime_state (
        device_id,
        cloud_device_id,
        service_id,
        cloud_status,
        reported_properties,
        desired_properties,
        summary,
        run_state,
        heat_temp,
        room_temp,
        fuel_consumption,
        error_code,
        position,
        reported_at,
        last_seen_at
      )
      VALUES (
        $1, $2, $3, $4,
        $5::jsonb, $6::jsonb, $7::jsonb,
        $8, $9, $10, $11, $12, $13,
        $14::timestamptz, $15::timestamptz
      )
      ON CONFLICT (device_id) DO UPDATE SET
        cloud_device_id = EXCLUDED.cloud_device_id,
        service_id = EXCLUDED.service_id,
        cloud_status = EXCLUDED.cloud_status,
        reported_properties = EXCLUDED.reported_properties,
        desired_properties = EXCLUDED.desired_properties,
        summary = EXCLUDED.summary,
        run_state = EXCLUDED.run_state,
        heat_temp = EXCLUDED.heat_temp,
        room_temp = EXCLUDED.room_temp,
        fuel_consumption = EXCLUDED.fuel_consumption,
        error_code = EXCLUDED.error_code,
        position = EXCLUDED.position,
        reported_at = EXCLUDED.reported_at,
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = NOW()
    `,
    [
      input.deviceId,
      input.cloudDeviceId,
      input.runtime.serviceId,
      input.runtime.cloudStatus,
      JSON.stringify(input.runtime.reportedProperties || {}),
      JSON.stringify(input.runtime.desiredProperties || {}),
      JSON.stringify(input.runtime.summary || {}),
      input.runtime.runState,
      input.runtime.heatTemp,
      input.runtime.roomTemp,
      input.runtime.fuelConsumption,
      input.runtime.errorCode,
      input.runtime.position,
      input.runtime.reportedAt,
      input.runtime.lastSeenAt,
    ]
  );

  await executor.query(
    `
      UPDATE devices
      SET
        is_on = COALESCE($2, is_on),
        fire_level = COALESCE($3, fire_level),
        temp = COALESCE($4, temp),
        flow = COALESCE($5, flow),
        last_heartbeat_at = COALESCE($6::timestamptz, last_heartbeat_at),
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      input.deviceId,
      input.runtime.compatibility.isOn,
      input.runtime.compatibility.fireLevel,
      input.runtime.compatibility.temp,
      input.runtime.compatibility.flow,
      input.runtime.lastSeenAt || input.runtime.reportedAt,
    ]
  );
}

export async function insertIotRawMessage(
  executor: DatabaseExecutor,
  input: {
    provider: string;
    deviceId?: string | null;
    cloudDeviceId?: string | null;
    nodeId?: string | null;
    resource: string;
    event: string;
    requestId?: string | null;
    payload: Record<string, unknown>;
  }
) {
  const id = randomUUID();

  await executor.query(
    `
      INSERT INTO iot_raw_messages (
        id,
        provider,
        device_id,
        cloud_device_id,
        node_id,
        resource,
        event,
        request_id,
        payload,
        received_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW()
      )
    `,
    [
      id,
      input.provider,
      input.deviceId || null,
      input.cloudDeviceId || null,
      input.nodeId || null,
      input.resource,
      input.event,
      input.requestId || null,
      JSON.stringify(input.payload || {}),
    ]
  );

  return id;
}

export async function insertDeviceTelemetryHistory(
  executor: DatabaseExecutor,
  input: {
    deviceId: string;
    cloudDeviceId: string;
    serviceId: string;
    properties: Record<string, unknown>;
    reportedAt?: string | null;
  }
) {
  await executor.query(
    `
      INSERT INTO device_telemetry_history (
        id,
        device_id,
        cloud_device_id,
        service_id,
        properties,
        reported_at,
        received_at
      )
      VALUES (
        $1, $2, $3, $4, $5::jsonb, $6::timestamptz, NOW()
      )
    `,
    [
      randomUUID(),
      input.deviceId,
      input.cloudDeviceId,
      input.serviceId,
      JSON.stringify(input.properties || {}),
      input.reportedAt || null,
    ]
  );
}

export async function createDeviceCommandAudit(
  executor: DatabaseExecutor,
  input: {
    id: string;
    deviceId: string;
    deviceSn: string;
    operatorType: 'admin' | 'system' | 'user';
    operatorAdminId?: string | null;
    operatorUserUid?: string | null;
    operatorName: string;
    commandType: string;
    requestPayload: Record<string, unknown>;
    cloudDeviceId: string;
  }
) {
  await executor.query(
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
        cloud_device_id,
        started_at,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9::jsonb, NULL, 'pending', NULL, $10, NOW(), NOW()
      )
    `,
    [
      input.id,
      input.deviceId,
      input.deviceSn,
      input.operatorType,
      input.operatorAdminId || null,
      input.operatorUserUid || null,
      input.operatorName,
      input.commandType,
      JSON.stringify(input.requestPayload || {}),
      input.cloudDeviceId,
    ]
  );
}

export async function finishDeviceCommandAudit(
  executor: DatabaseExecutor,
  input: {
    id: string;
    status: 'success' | 'failed' | 'timeout';
    responsePayload?: Record<string, unknown> | null;
    failureReason?: string | null;
    cloudRequestId?: string | null;
    resultCode?: number | null;
    resultMessage?: string | null;
    requestTopic?: string | null;
  }
) {
  await executor.query(
    `
      UPDATE command_audit
      SET
        response_payload = $2::jsonb,
        status = $3,
        failure_reason = $4,
        cloud_request_id = $5,
        request_topic = $6,
        result_code = $7,
        result_message = $8,
        acked_at = CASE WHEN $3 = 'success' THEN NOW() ELSE acked_at END,
        finished_at = NOW()
      WHERE id = $1
    `,
    [
      input.id,
      JSON.stringify(input.responsePayload || {}),
      input.status,
      input.failureReason || null,
      input.cloudRequestId || null,
      input.requestTopic || null,
      input.resultCode ?? null,
      input.resultMessage || null,
    ]
  );
}

export async function upsertPendingAlert(
  executor: DatabaseExecutor,
  input: {
    deviceId: string;
    deviceSn: string;
    ownerUid: string;
    type: 'gas_leak' | 'dry_burn' | 'over_temp' | 'tilt' | 'low_battery' | 'offline';
    level: 'critical' | 'high' | 'normal';
    title: string;
    message: string;
    metricKey?: string | null;
    currentValue?: number | null;
    thresholdValue?: number | null;
    detail?: Record<string, unknown> | null;
  }
) {
  const existing = await executor.query<{ id: string }>(
    `
      SELECT id
      FROM alerts
      WHERE device_id = $1 AND type = $2 AND status = 'pending'
      ORDER BY triggered_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [input.deviceId, input.type]
  );

  if (existing.rows[0]?.id) {
    await executor.query(
      `
        UPDATE alerts
        SET
          level = $2,
          title = $3,
          message = $4,
          metric_key = $5,
          current_value = $6,
          threshold_value = $7,
          detail = $8::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        existing.rows[0].id,
        input.level,
        input.title,
        input.message,
        input.metricKey || null,
        input.currentValue ?? null,
        input.thresholdValue ?? null,
        JSON.stringify(input.detail || {}),
      ]
    );

    return existing.rows[0].id;
  }

  const id = randomUUID();
  await executor.query(
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
        triggered_at,
        detail,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11, NOW(), $12::jsonb, NOW(), NOW()
      )
    `,
    [
      id,
      input.deviceId,
      input.deviceSn,
      input.ownerUid,
      input.type,
      input.level,
      input.title,
      input.message,
      input.metricKey || null,
      input.currentValue ?? null,
      input.thresholdValue ?? null,
      JSON.stringify(input.detail || {}),
    ]
  );

  return id;
}

export async function resolvePendingAlertsByType(
  executor: DatabaseExecutor,
  input: {
    deviceId: string;
    type: 'gas_leak' | 'dry_burn' | 'over_temp' | 'tilt' | 'low_battery' | 'offline';
    comment?: string | null;
  }
) {
  await executor.query(
    `
      UPDATE alerts
      SET
        status = 'resolved',
        handler_comment = COALESCE($3, handler_comment),
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE device_id = $1 AND type = $2 AND status = 'pending'
    `,
    [input.deviceId, input.type, input.comment || null]
  );
}
