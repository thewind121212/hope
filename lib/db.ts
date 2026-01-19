import { neon, neonConfig } from '@neondatabase/serverless';

if (typeof process !== 'undefined' && !process.env.DATABASE_URL) {
  import('dotenv').then(({ config }) => config());
}

neonConfig.fetchConnectionCache = true;

let pool: ReturnType<typeof neon> | null = null;

export function getPool() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }
    pool = neon(databaseUrl);
  }
  return pool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const pool = getPool();
    const result = await (pool as any).query(sql, params);
    return result as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getConnection() {
  return getPool();
}
