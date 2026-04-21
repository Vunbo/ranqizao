import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { env } from '../config/env';
import { setPool } from './client';

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  const adminPool = new Pool({
    ...env.db,
    database: env.adminDatabase,
  });

  try {
    const existing = await adminPool.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"',
      [env.databaseName]
    );

    if (!existing.rows[0]?.exists) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(env.databaseName)}`);
    }
  } finally {
    await adminPool.end();
  }
}

async function ensureDefaultUser(mainPool: Pool) {
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

async function ensureSchema(mainPool: Pool) {
  await mainPool.query(`
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
      home_id TEXT REFERENCES homes(id) ON DELETE SET NULL,
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
  `);

  await mainPool.query(`
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
    CREATE INDEX IF NOT EXISTS idx_devices_home_id ON devices(home_id);
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
  `);

  await mainPool.query(`
    INSERT INTO home_device_links (home_id, device_id)
    SELECT home_id, id
    FROM devices
    WHERE home_id IS NOT NULL
    ON CONFLICT (home_id, device_id) DO NOTHING;
  `);

  await mainPool.query(`
    UPDATE users
    SET
      primary_email = COALESCE(primary_email, email),
      updated_at = NOW()
    WHERE email IS NOT NULL
      AND primary_email IS NULL;
  `);

  await mainPool.query(`
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
  `).catch(async () => {
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
        env.wechatMiniProgram.appId || '',
        row.wechat_unionid,
        JSON.stringify({
          openid: row.wechat_openid,
          unionid: row.wechat_unionid,
        }),
      ]
    );
  }

  await ensureDefaultUser(mainPool);

  const deviceExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM devices) AS "exists"'
  );

  if (!deviceExists.rows[0]?.exists) {
    const firstUser = await mainPool.query<{ short_uid: string }>(
      'SELECT short_uid FROM users ORDER BY created_at ASC LIMIT 1'
    );

    if (firstUser.rows[0]?.short_uid) {
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
        [randomUUID(), '智能安全灶', firstUser.rows[0].short_uid]
      );
    }
  }

  const inventoryExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM device_inventory) AS "exists"'
  );

  if (!inventoryExists.rows[0]?.exists) {
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
        randomUUID(),
        'STOVE-QR-001',
        'SN-AI-STOVE-001',
        'AI 安全灶 Pro',
        '1.0.0',
        randomUUID(),
        'STOVE-QR-002',
        'SN-AI-STOVE-002',
        'AI 安全灶 Pro',
        '1.0.0',
        randomUUID(),
        'STOVE-QR-003',
        'SN-AI-STOVE-003',
        'AI 安全灶 Lite',
        '1.0.0',
      ]
    );
  }
}

export async function bootstrapDatabase() {
  await ensureDatabaseExists();

  const mainPool = new Pool({
    ...env.db,
    database: env.databaseName,
  });

  setPool(mainPool);
  await ensureSchema(mainPool);
}
