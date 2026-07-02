import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from 'pg';

let pool: Pool | null = null;

export type DatabaseExecutor = Pick<PoolClient, 'query'>;

export function setPool(nextPool: Pool) {
  pool = nextPool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }

  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(
  handler: (executor: DatabaseExecutor) => Promise<T>
) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
