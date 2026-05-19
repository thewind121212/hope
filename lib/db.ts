import { Pool } from 'pg';

if (typeof process !== 'undefined' && !process.env.DATABASE_URL) {
  import('dotenv').then(({ config }) => config({ path: '.env.local' }));
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }
    pool = new Pool({
      connectionString: databaseUrl,
      ssl:
        process.env.DATABASE_SSL === 'false'
          ? false
          : databaseUrl.includes('sslmode=disable')
            ? false
            : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function query<T = unknown>(
  sql: string,
  params: Array<unknown> = []
): Promise<T[]> {
  try {
    const result = await getPool().query(sql, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getConnection() {
  return getPool();
}
