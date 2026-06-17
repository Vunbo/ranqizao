import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { env } from '../../config/env';
import { applySchemaComments } from './schema-comments';
import { normalizeDeviceLocations } from './location-normalization';
import {
  ensureDefaultAdminUser,
  ensureDefaultMallPage,
  ensureDefaultOpsConfigs,
  ensureDefaultOpsRecords,
  ensureDefaultUser,
  ensureInventorySeed,
  ensureWechatAuthIdentities,
  ensureDeviceSeed,
  backfillEmailPasswordIdentities,
  backfillPrimaryEmails,
} from './seeds';
import { ensureMigrations } from './migrations';

// ---------------------------------------------------------------------------
// Schema creation — idempotent, runs every startup (fast: all IF NOT EXISTS)
// ---------------------------------------------------------------------------

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
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    valve_status VARCHAR(16) NOT NULL DEFAULT 'closed',
    last_heartbeat_at TIMESTAMPTZ,
    region_path TEXT,
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

  CREATE TABLE IF NOT EXISTS mall_page_contents (
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

// ---------------------------------------------------------------------------
// Bootstrap — ensures schema, migrations, seeds, and normalization
// ---------------------------------------------------------------------------

export async function ensureSchema(mainPool: Pool) {
  // 1. Create tables (idempotent)
  await mainPool.query(CREATE_SCHEMA_SQL);

  // 2. Apply tracked migrations (runs only once per migration)
  await ensureMigrations(mainPool);

  // 3. Data backfills and seed
  await backfillPrimaryEmails(mainPool);
  await backfillEmailPasswordIdentities(mainPool);
  await ensureWechatAuthIdentities(mainPool, env.wechatMiniProgram.appId || '');

  await ensureDefaultUser(mainPool);
  await ensureDefaultAdminUser(mainPool);
  await ensureDefaultOpsConfigs(mainPool);
  await ensureDefaultMallPage(mainPool);
  await ensureDefaultOpsRecords(mainPool);
  await ensureDeviceSeed(mainPool, {
    createId: () => randomUUID(),
  });
  await ensureInventorySeed(mainPool, {
    createId: () => randomUUID(),
  });

  // 4. Post-migration normalization
  await applySchemaComments(mainPool);
  await normalizeDeviceLocations(mainPool);
}
