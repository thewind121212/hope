import { config } from 'dotenv';
config({ path: '.env.local' });

import { query } from '../lib/db';

async function main() {
  try {
    const tables = await query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['public']);
    console.log('Tables in database:', tables);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));
