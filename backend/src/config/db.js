const { Pool, types } = require('pg');

// Return DATE and TIMESTAMP columns as plain strings instead of JS Date objects.
// Without this, pg converts "2026-06-11" → Date(2026-06-10T18:30:00Z) in UTC,
// which serializes to the wrong ISO string and breaks IST date comparisons.
types.setTypeParser(1082, (val) => val);   // DATE
types.setTypeParser(1114, (val) => val);   // TIMESTAMP WITHOUT TIME ZONE
types.setTypeParser(1184, (val) => val);   // TIMESTAMP WITH TIME ZONE

// POSTGRES_URL takes priority — avoids Railway's conflicting empty DATABASE_URL injection
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('.internal') || dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

module.exports = pool;
