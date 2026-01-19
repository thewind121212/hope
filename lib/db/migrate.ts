import { config } from 'dotenv';
config({ path: '.env.local' });

import { query } from '../db';
import fs from 'fs';
import path from 'path';

export async function runMigrations() {
  console.log('Starting migrations...');
  const migrationsDir = path.join(process.cwd(), 'lib/db/migrations');
  console.log('Migrations directory:', migrationsDir);
  const files = fs.readdirSync(migrationsDir).sort();
  console.log('Found files:', files);

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    console.log(`Running migration: ${file} (${statements.length} statements)`);

    for (const statement of statements) {
      try {
        await query(statement, []);
      } catch (error: any) {
        if (error.code === '42P07') {
          console.log(`⚠ Statement already exists, skipping`);
        } else {
          console.error(`✗ Migration ${file} failed:`, error);
          throw error;
        }
      }
    }
    console.log(`✓ Migration ${file} completed`);
  }

  console.log('All migrations completed successfully!');
}

runMigrations().catch(console.error);
