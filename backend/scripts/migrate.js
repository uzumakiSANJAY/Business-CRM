const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const migrations = [
  'schema.sql',
  'migration_v2.sql',
  'migration_v3.sql',
  'migration_v4.sql',
];

async function run() {
  const client = await pool.connect();
  try {
    for (const file of migrations) {
      const filePath = path.join(__dirname, '..', 'database', file);
      if (!fs.existsSync(filePath)) { console.log(`Skipping missing file: ${file}`); continue; }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running ${file}...`);
      await client.query(sql);
      console.log(`  ✓ ${file} done`);
    }
    console.log('All migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => { console.error('Migration failed:', err.message); process.exit(1); });
