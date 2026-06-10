import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { env } from '../../config/env';
import { applySchemaComments } from './schema-comments';
import { normalizeDeviceLocations } from './location-normalization';
import {
  ensureDefaultAdminUser,
  ensureDefaultOpsConfigs,
  ensureDefaultOpsRecords,
  ensureDefaultUser,
  ensureInventorySeed,
  ensureWechatAuthIdentities,
  ensureDeviceSeed,
  backfillEmailPasswordIdentities,
  backfillPrimaryEmails,
} from './seeds';

const CREATE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    short_uid VARCHAR(8) UNIQUE NOT NULL,
    email TEXT UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT,
    primary_email TEXT,
    primary_phone TEXT,
    photo_url TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    wechat_openid TEXT,
    wechat_unionid TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS auth_identities (
    id TEXT PRIMARY KEY,
    user_pk TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_app_id TEXT NOT NULL DEFAULT '',
    union_id TEXT,
    password_hash TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    meta JSONB,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS auth_verification_codes (
    id TEXT PRIMARY KEY,
    target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('phone')),
    target_value TEXT NOT NULL,
    purpose VARCHAR(16) NOT NULL CHECK (purpose IN ('login', 'bind', 'unbind')),
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role VARCHAR(32) NOT NULL
      CHECK (role IN ('super_admin', 'ops_admin', 'ops_viewer')),
    status VARCHAR(16) NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'disabled')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS homes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS device_inventory (
    id TEXT PRIMARY KEY,
    qr_code TEXT UNIQUE NOT NULL,
    serial_number TEXT UNIQUE NOT NULL,
    product_model TEXT NOT NULL,
    firmware_version TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'available'
      CHECK (status IN ('available', 'bound', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
    inventory_id TEXT UNIQUE REFERENCES device_inventory(id) ON DELETE SET NULL,
    serial_number TEXT UNIQUE,
    location JSONB,
    is_on BOOLEAN NOT NULL DEFAULT FALSE,
    fire_level INTEGER NOT NULL DEFAULT 60,
    temp DOUBLE PRECISION NOT NULL DEFAULT 25,
    gas DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    smoke DOUBLE PRECISION NOT NULL DEFAULT 2,
    flow DOUBLE PRECISION NOT NULL DEFAULT 0,
    human_detected BOOLEAN NOT NULL DEFAULT FALSE,
    vibration BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS home_members (
    home_id TEXT NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    user_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (home_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS home_device_links (
    home_id TEXT NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (home_id, device_id)
  );

  CREATE TABLE IF NOT EXISTS device_shares (
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    user_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (device_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS operation_logs (
    id TEXT PRIMARY KEY,
    stove_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    owner_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
    event TEXT NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('info', 'warning', 'success')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS device_binding_events (
    id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL REFERENCES device_inventory(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    owner_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL
      CHECK (event_type IN ('bind_success', 'unbind_success')),
    detail JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    device_sn TEXT NOT NULL,
    owner_uid VARCHAR(8) REFERENCES users(short_uid) ON DELETE SET NULL,
    type VARCHAR(32) NOT NULL
      CHECK (type IN ('gas_leak', 'dry_burn', 'over_temp', 'tilt', 'low_battery', 'offline')),
    level VARCHAR(16) NOT NULL
      CHECK (level IN ('critical', 'high', 'normal')),
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'resolved', 'false_positive')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metric_key VARCHAR(32),
    current_value DOUBLE PRECISION,
    threshold_value DOUBLE PRECISION,
    handler_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    handler_comment TEXT,
    is_false_positive BOOLEAN NOT NULL DEFAULT FALSE,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    detail JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS command_audit (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    device_sn TEXT NOT NULL,
    operator_type VARCHAR(16) NOT NULL
      CHECK (operator_type IN ('admin', 'system', 'user')),
    operator_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    operator_user_uid VARCHAR(8) REFERENCES users(short_uid) ON DELETE SET NULL,
    operator_name TEXT NOT NULL,
    command_type VARCHAR(32) NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    status VARCHAR(16) NOT NULL
      CHECK (status IN ('pending', 'success', 'failed', 'timeout')),
    failure_reason TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS config_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    template_type VARCHAR(16) NOT NULL CHECK (template_type IN ('message')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    channels JSONB NOT NULL,
    variables JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    rule_key VARCHAR(64) NOT NULL UNIQUE,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('critical', 'high', 'normal')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    metric_key VARCHAR(32),
    expression TEXT NOT NULL,
    actions JSONB NOT NULL,
    delay_seconds INTEGER NOT NULL DEFAULT 0,
    scope JSONB,
    created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS risk_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    rule_key VARCHAR(64) NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    threshold_expression TEXT NOT NULL,
    action VARCHAR(32) NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    scope JSONB,
    created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS merchant_page_contents (
    id TEXT PRIMARY KEY,
    page_key VARCHAR(64) NOT NULL,
    version_type VARCHAR(16) NOT NULL
      CHECK (version_type IN ('draft', 'published')),
    title TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    published_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS merchant_applications (
    id TEXT PRIMARY KEY,
    user_pk TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected')),
    level_code VARCHAR(32) NOT NULL
      CHECK (level_code IN ('operations_center', 'district_agent')),
    merchant_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    region TEXT NOT NULL,
    address TEXT NOT NULL,
    note TEXT,
    snapshot JSONB,
    review_comment TEXT,
    reviewed_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS merchant_profiles (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES merchant_applications(id) ON DELETE CASCADE,
    user_pk TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    level_code VARCHAR(32) NOT NULL
      CHECK (level_code IN ('operations_center', 'district_agent')),
    status VARCHAR(16) NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'disabled')),
    approved_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const ALTER_SCHEMA_SQL = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_email TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_phone TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_unionid TEXT;
  ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
  ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

  ALTER TABLE auth_verification_codes
    DROP CONSTRAINT IF EXISTS auth_verification_codes_purpose_check;
  ALTER TABLE auth_verification_codes
    ADD CONSTRAINT auth_verification_codes_purpose_check
    CHECK (purpose IN ('login', 'bind', 'unbind'));

  ALTER TABLE devices ADD COLUMN IF NOT EXISTS inventory_id TEXT;
  ALTER TABLE devices ADD COLUMN IF NOT EXISTS serial_number TEXT;
  ALTER TABLE devices ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE devices ADD COLUMN IF NOT EXISTS valve_status VARCHAR(16) NOT NULL DEFAULT 'closed';
  ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
  ALTER TABLE devices ADD COLUMN IF NOT EXISTS region_path TEXT;
  ALTER TABLE devices
    DROP CONSTRAINT IF EXISTS devices_inventory_id_fkey;
  ALTER TABLE devices
    ADD CONSTRAINT devices_inventory_id_fkey
    FOREIGN KEY (inventory_id) REFERENCES device_inventory(id) ON DELETE SET NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_openid_unique
    ON users(wechat_openid)
    WHERE wechat_openid IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_unionid_unique
    ON users(wechat_unionid)
    WHERE wechat_unionid IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_inventory_id_unique
    ON devices(inventory_id)
    WHERE inventory_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_serial_number_unique
    ON devices(serial_number)
    WHERE serial_number IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_identities_provider_user_unique
    ON auth_identities(provider, provider_user_id, provider_app_id);
  CREATE INDEX IF NOT EXISTS idx_auth_identities_user_pk
    ON auth_identities(user_pk);
  CREATE INDEX IF NOT EXISTS idx_auth_identities_union_id
    ON auth_identities(union_id);
  CREATE INDEX IF NOT EXISTS idx_auth_verification_codes_lookup
    ON auth_verification_codes(target_type, target_value, purpose, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_devices_owner_id ON devices(owner_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username
    ON admin_users(username);
  CREATE INDEX IF NOT EXISTS idx_devices_last_heartbeat_at ON devices(last_heartbeat_at);
  CREATE INDEX IF NOT EXISTS idx_devices_locked ON devices(locked);
  CREATE INDEX IF NOT EXISTS idx_devices_region_path ON devices(region_path);
  CREATE INDEX IF NOT EXISTS idx_devices_location_province
    ON devices((location->>'province'));
  CREATE INDEX IF NOT EXISTS idx_devices_location_city
    ON devices((location->>'city'));
  CREATE INDEX IF NOT EXISTS idx_home_members_user_id ON home_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_home_device_links_device_id
    ON home_device_links(device_id);
  CREATE INDEX IF NOT EXISTS idx_device_shares_user_id ON device_shares(user_id);
  CREATE INDEX IF NOT EXISTS idx_operation_logs_stove_id ON operation_logs(stove_id);
  CREATE INDEX IF NOT EXISTS idx_device_inventory_status ON device_inventory(status);
  CREATE INDEX IF NOT EXISTS idx_device_binding_events_inventory_id
    ON device_binding_events(inventory_id);
  CREATE INDEX IF NOT EXISTS idx_device_binding_events_owner_id
    ON device_binding_events(owner_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_status_level_triggered_at
    ON alerts(status, level, triggered_at DESC);
  CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
  CREATE INDEX IF NOT EXISTS idx_alerts_owner_uid ON alerts(owner_uid);
  CREATE INDEX IF NOT EXISTS idx_command_audit_device_id_created_at
    ON command_audit(device_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_command_audit_status_created_at
    ON command_audit(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_command_audit_command_type
    ON command_audit(command_type);
  CREATE INDEX IF NOT EXISTS idx_command_audit_operator_admin_id
    ON command_audit(operator_admin_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_config_templates_name ON config_templates(name);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_rules_rule_key ON alert_rules(rule_key);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_rules_rule_key ON risk_rules(rule_key);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_page_contents_page_version
    ON merchant_page_contents(page_key, version_type);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_applications_pending_user
    ON merchant_applications(user_pk)
    WHERE status = 'pending';
  CREATE INDEX IF NOT EXISTS idx_merchant_applications_status_created_at
    ON merchant_applications(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_merchant_applications_user_pk_created_at
    ON merchant_applications(user_pk, created_at DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_profiles_user_pk
    ON merchant_profiles(user_pk);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_profiles_application_id
    ON merchant_profiles(application_id);
  CREATE INDEX IF NOT EXISTS idx_merchant_profiles_status_created_at
    ON merchant_profiles(status, created_at DESC);
`;

const CLEANUP_LEGACY_COLUMNS_SQL = `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'devices'
        AND column_name = 'home_id'
    ) THEN
      EXECUTE '
        INSERT INTO home_device_links (home_id, device_id)
        SELECT home_id, id
        FROM devices
        WHERE home_id IS NOT NULL
        ON CONFLICT (home_id, device_id) DO NOTHING
      ';
      EXECUTE 'DROP INDEX IF EXISTS idx_devices_home_id';
      EXECUTE 'ALTER TABLE devices DROP COLUMN IF EXISTS home_id';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'devices'
        AND column_name = 'region_code'
    ) THEN
      EXECUTE 'DROP INDEX IF EXISTS idx_devices_region_code';
      EXECUTE 'ALTER TABLE devices DROP COLUMN IF EXISTS region_code';
    END IF;
  END $$;
`;

export async function ensureSchema(mainPool: Pool) {
  await mainPool.query(CREATE_SCHEMA_SQL);
  await mainPool.query(ALTER_SCHEMA_SQL);
  await mainPool.query(CLEANUP_LEGACY_COLUMNS_SQL);

  await backfillPrimaryEmails(mainPool);
  await backfillEmailPasswordIdentities(mainPool);
  await ensureWechatAuthIdentities(mainPool, env.wechatMiniProgram.appId || '');

  await ensureDefaultUser(mainPool);
  await ensureDefaultAdminUser(mainPool);
  await ensureDefaultOpsConfigs(mainPool);
  await ensureDefaultOpsRecords(mainPool);
  await ensureDeviceSeed(mainPool, {
    createId: () => randomUUID(),
  });
  await ensureInventorySeed(mainPool, {
    createId: () => randomUUID(),
  });

  await applySchemaComments(mainPool);
  await normalizeDeviceLocations(mainPool);
}
