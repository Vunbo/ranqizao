import { Pool } from 'pg';
import { quoteIdentifier, quoteLiteral } from './helpers';

const IOT_CREATE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS device_cloud_registry (
    id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL UNIQUE REFERENCES device_inventory(id) ON DELETE CASCADE,
    device_id TEXT UNIQUE REFERENCES devices(id) ON DELETE SET NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'huawei_iotda',
    resource_space_id TEXT,
    product_id TEXT,
    cloud_device_id TEXT NOT NULL UNIQUE,
    node_id TEXT,
    auth_type VARCHAR(32) NOT NULL DEFAULT 'aksk',
    provision_mode VARCHAR(32) NOT NULL DEFAULT 'self_registered',
    provision_status VARCHAR(32) NOT NULL DEFAULT 'active',
    cloud_device_name TEXT,
    activated_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS device_runtime_state (
    device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    cloud_device_id TEXT NOT NULL,
    service_id VARCHAR(64) NOT NULL,
    cloud_status VARCHAR(32),
    reported_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    desired_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    run_state VARCHAR(32),
    heat_temp DOUBLE PRECISION,
    room_temp DOUBLE PRECISION,
    fuel_consumption DOUBLE PRECISION,
    error_code TEXT,
    position TEXT,
    reported_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS iot_raw_messages (
    id TEXT PRIMARY KEY,
    provider VARCHAR(32) NOT NULL,
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    cloud_device_id TEXT,
    node_id TEXT,
    resource VARCHAR(64) NOT NULL,
    event VARCHAR(64) NOT NULL,
    request_id TEXT,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS device_telemetry_history (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    cloud_device_id TEXT NOT NULL,
    service_id VARCHAR(64) NOT NULL,
    properties JSONB NOT NULL,
    reported_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const IOT_ALTER_SCHEMA_SQL = `
  ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS node_id TEXT;
  ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS imei TEXT;
  ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS product_code VARCHAR(64);
  ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS burner_count SMALLINT;
  ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS manufacturer TEXT;
  ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS hardware_version TEXT;

  ALTER TABLE command_audit ADD COLUMN IF NOT EXISTS cloud_request_id TEXT;
  ALTER TABLE command_audit ADD COLUMN IF NOT EXISTS cloud_device_id TEXT;
  ALTER TABLE command_audit ADD COLUMN IF NOT EXISTS request_topic TEXT;
  ALTER TABLE command_audit ADD COLUMN IF NOT EXISTS result_code INTEGER;
  ALTER TABLE command_audit ADD COLUMN IF NOT EXISTS result_message TEXT;
  ALTER TABLE command_audit ADD COLUMN IF NOT EXISTS acked_at TIMESTAMPTZ;

  ALTER TABLE device_cloud_registry ALTER COLUMN auth_type SET DEFAULT 'aksk';

  UPDATE device_cloud_registry
  SET auth_type = 'aksk'
  WHERE provider = 'huawei_iotda' AND auth_type = 'iam_password';

  CREATE UNIQUE INDEX IF NOT EXISTS idx_device_inventory_node_id_unique
    ON device_inventory(node_id)
    WHERE node_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_device_inventory_imei_unique
    ON device_inventory(imei)
    WHERE imei IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_device_inventory_product_code
    ON device_inventory(product_code);
  CREATE INDEX IF NOT EXISTS idx_device_cloud_registry_device_id
    ON device_cloud_registry(device_id);
  CREATE INDEX IF NOT EXISTS idx_device_cloud_registry_cloud_device_id
    ON device_cloud_registry(cloud_device_id);
  CREATE INDEX IF NOT EXISTS idx_device_cloud_registry_node_id
    ON device_cloud_registry(node_id);
  CREATE INDEX IF NOT EXISTS idx_device_runtime_state_cloud_status
    ON device_runtime_state(cloud_status);
  CREATE INDEX IF NOT EXISTS idx_device_runtime_state_last_seen_at
    ON device_runtime_state(last_seen_at DESC);
  CREATE INDEX IF NOT EXISTS idx_iot_raw_messages_cloud_device_id_received_at
    ON iot_raw_messages(cloud_device_id, received_at DESC);
  CREATE INDEX IF NOT EXISTS idx_iot_raw_messages_resource_event_received_at
    ON iot_raw_messages(resource, event, received_at DESC);
  CREATE INDEX IF NOT EXISTS idx_device_telemetry_history_device_reported_at
    ON device_telemetry_history(device_id, reported_at DESC);
`;

const iotTableComments: Record<string, string> = {
  device_cloud_registry: '本地设备与华为云 IoTDA 设备映射表',
  device_runtime_state: '设备最新运行态快照表',
  iot_raw_messages: 'IoT 平台原始回调报文表',
  device_telemetry_history: '设备关键遥测历史表',
};

const iotColumnComments: Record<string, Record<string, string>> = {
  device_inventory: {
    node_id: '设备在 IoT 平台的节点标识',
    imei: '设备 4G 模块 IMEI',
    product_code: '业务产品编码',
    burner_count: '灶头数量',
    manufacturer: '设备厂商',
    hardware_version: '硬件版本',
  },
  device_cloud_registry: {
    id: '映射记录主键',
    inventory_id: '关联库存主键',
    device_id: '关联业务设备主键',
    provider: '云平台提供方',
    resource_space_id: '华为云资源空间标识',
    product_id: '华为云产品 ID',
    cloud_device_id: '华为云设备 ID',
    node_id: '华为云节点标识',
    auth_type: '云侧鉴权方式',
    provision_mode: '入云方式',
    provision_status: '云侧注册状态',
    cloud_device_name: '云侧设备名称',
    activated_at: '云侧激活时间',
    last_seen_at: '云侧最近在线时间',
    last_sync_at: '最近同步时间',
    meta: '云侧原始元数据',
    created_at: '创建时间',
    updated_at: '更新时间',
  },
  device_runtime_state: {
    device_id: '业务设备主键',
    cloud_device_id: '华为云设备 ID',
    service_id: '服务模型标识',
    cloud_status: '云侧在线状态',
    reported_properties: '最近一次上报属性',
    desired_properties: '最近一次期望属性',
    summary: '运行态摘要 JSON',
    run_state: '设备运行状态',
    heat_temp: '加热温度',
    room_temp: '环境温度',
    fuel_consumption: '燃料消耗量',
    error_code: '故障码',
    position: '设备上报位置',
    reported_at: '属性上报时间',
    last_seen_at: '最近在线时间',
    created_at: '创建时间',
    updated_at: '更新时间',
  },
  iot_raw_messages: {
    id: '原始报文主键',
    provider: 'IoT 平台提供方',
    device_id: '业务设备主键',
    cloud_device_id: '云侧设备 ID',
    node_id: '云侧节点标识',
    resource: '资源类型',
    event: '事件类型',
    request_id: '请求标识',
    payload: '原始报文 JSON',
    received_at: '接收时间',
  },
  device_telemetry_history: {
    id: '遥测历史主键',
    device_id: '业务设备主键',
    cloud_device_id: '云侧设备 ID',
    service_id: '服务模型标识',
    properties: '属性快照 JSON',
    reported_at: '设备上报时间',
    received_at: '平台接收时间',
  },
  command_audit: {
    cloud_request_id: '云侧命令请求标识',
    cloud_device_id: '云侧设备 ID 快照',
    request_topic: '云侧命令主题',
    result_code: '设备响应结果码',
    result_message: '设备响应结果说明',
    acked_at: '设备确认时间',
  },
};

async function applyIotSchemaComments(mainPool: Pool) {
  for (const [table, comment] of Object.entries(iotTableComments)) {
    await mainPool.query(
      `COMMENT ON TABLE ${quoteIdentifier(table)} IS ${quoteLiteral(comment)}`
    );
  }

  for (const [table, columns] of Object.entries(iotColumnComments)) {
    for (const [column, comment] of Object.entries(columns)) {
      await mainPool.query(
        `COMMENT ON COLUMN ${quoteIdentifier(table)}.${quoteIdentifier(column)} IS ${quoteLiteral(comment)}`
      );
    }
  }
}

export async function ensureIotSchema(mainPool: Pool) {
  await mainPool.query(IOT_CREATE_SCHEMA_SQL);
  await mainPool.query(IOT_ALTER_SCHEMA_SQL);
  await applyIotSchemaComments(mainPool);
}
