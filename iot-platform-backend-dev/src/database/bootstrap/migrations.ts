import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Migration tracking — ensures each migration runs at most once
// ---------------------------------------------------------------------------

const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function hasMigrationRun(pool: Pool, name: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1) AS "exists"`,
    [name]
  );
  return result.rows[0]?.exists ?? false;
}

async function recordMigration(pool: Pool, name: string) {
  await pool.query(
    `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`,
    [name]
  );
}

async function runMigration(pool: Pool, name: string, sql: string) {
  const alreadyRun = await hasMigrationRun(pool, name);
  if (alreadyRun) return;
  await pool.query(sql);
  await recordMigration(pool, name);
}

// ---------------------------------------------------------------------------
// Individual migrations (ordered chronologically)
// ---------------------------------------------------------------------------

const MIGRATION_V1_ALTER_SCHEMA = `
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
  CREATE UNIQUE INDEX IF NOT EXISTS idx_mall_page_contents_page_version
    ON mall_page_contents(page_key, version_type);
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

const MIGRATION_V2_CLEANUP_LEGACY = `
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

// ---------------------------------------------------------------------------
// Migration registry — append new migrations here
// ---------------------------------------------------------------------------

const MIGRATIONS: Array<{ name: string; sql: string }> = [
  { name: 'v1_alter_schema', sql: MIGRATION_V1_ALTER_SCHEMA },
  { name: 'v2_cleanup_legacy_columns', sql: MIGRATION_V2_CLEANUP_LEGACY },
];

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function ensureMigrations(pool: Pool) {
  // Create tracking table first
  await pool.query(MIGRATIONS_TABLE_SQL);

  for (const migration of MIGRATIONS) {
    await runMigration(pool, migration.name, migration.sql);
  }
}
