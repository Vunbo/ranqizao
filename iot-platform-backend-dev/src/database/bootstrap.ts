import { Pool } from 'pg';
import { env } from '../config/env';
import { quoteIdentifier } from './bootstrap/helpers';
import { ensureSchema } from './bootstrap/schema';
import { setPool } from './client';

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

export async function bootstrapDatabase() {
  await ensureDatabaseExists();

  const mainPool = new Pool({
    ...env.db,
    database: env.databaseName,
  });

  setPool(mainPool);
  await ensureSchema(mainPool);
}
