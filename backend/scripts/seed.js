/**
 * Seed Script — Vendor Collection CRM
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in DATABASE_URL
 *   2. Run: node scripts/seed.js
 *
 * This will create:
 *   - 1 Admin user      (admin@crm.com       / Admin@123)
 *   - 2 Collector users (collector1@crm.com  / Collect@123)
 *                       (collector2@crm.com  / Collect@123)
 *   - 4 Sample vendors
 *   - 1 Sample active bill
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const url = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: url,
  ssl: url.includes('.internal') || url.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Seeding users...');

    // Hash passwords
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const collectorHash = await bcrypt.hash('Collect@123', 10);

    // Upsert admin
    const adminRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'ADMIN')
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             is_active = true
       RETURNING id, name, email, role`,
      ['CRM Administrator', 'admin@crm.com', adminHash]
    );
    const admin = adminRes.rows[0];
    console.log(`  Admin user: ${admin.email} (id=${admin.id})`);

    // Upsert collector 1
    const col1Res = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'COLLECTOR')
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             is_active = true
       RETURNING id, name, email, role`,
      ['Rahul Sharma', 'collector1@crm.com', collectorHash]
    );
    const col1 = col1Res.rows[0];
    console.log(`  Collector 1: ${col1.email} (id=${col1.id})`);

    // Upsert collector 2
    const col2Res = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'COLLECTOR')
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             is_active = true
       RETURNING id, name, email, role`,
      ['Priya Mehta', 'collector2@crm.com', collectorHash]
    );
    const col2 = col2Res.rows[0];
    console.log(`  Collector 2: ${col2.email} (id=${col2.id})`);

    console.log('\nSeeding vendors...');

    const vendorsData = [
      { name: 'Sharma Traders', contact_person: 'Anil Sharma', phone: '9876543210', address: '12, MG Road, Mumbai' },
      { name: 'Mehta Enterprises', contact_person: 'Sunil Mehta', phone: '9988776655', address: '45, Linking Road, Pune' },
      { name: 'Gupta & Sons', contact_person: 'Rajesh Gupta', phone: '8877665544', address: '78, Civil Lines, Delhi' },
      { name: 'Patel Suppliers', contact_person: 'Dinesh Patel', phone: '7766554433', address: '23, SG Highway, Ahmedabad' },
    ];

    const vendorIds = [];
    for (const v of vendorsData) {
      const vRes = await client.query(
        `INSERT INTO vendors (name, contact_person, phone, address, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING
         RETURNING id, name`,
        [v.name, v.contact_person, v.phone, v.address, admin.id]
      );

      if (vRes.rows.length) {
        vendorIds.push(vRes.rows[0].id);
        console.log(`  Vendor: ${vRes.rows[0].name} (id=${vRes.rows[0].id})`);
      } else {
        // Already exists — fetch its id
        const existing = await client.query('SELECT id, name FROM vendors WHERE name = $1', [v.name]);
        if (existing.rows.length) {
          vendorIds.push(existing.rows[0].id);
          console.log(`  Vendor already exists: ${existing.rows[0].name} (id=${existing.rows[0].id})`);
        }
      }
    }

    console.log('\nSeeding sample bill...');

    // Create one active bill for the first vendor (if not already present)
    if (vendorIds.length > 0) {
      const activeCheck = await client.query(
        "SELECT id FROM bills WHERE vendor_id = $1 AND status = 'ACTIVE'",
        [vendorIds[0]]
      );

      if (!activeCheck.rows.length) {
        const today = new Date().toISOString().split('T')[0];
        const billRes = await client.query(
          `INSERT INTO bills (vendor_id, amount, generated_date, generated_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id, vendor_id, amount, generated_date`,
          [vendorIds[0], 25000.00, today, admin.id]
        );
        const bill = billRes.rows[0];
        console.log(`  Bill created: id=${bill.id}, amount=${bill.amount}, vendor_id=${bill.vendor_id}`);

        // Sample pending collection for that bill
        const collectionRes = await client.query(
          `INSERT INTO collections (bill_id, vendor_id, collector_id, amount, collection_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [bill.id, vendorIds[0], col1.id, 10000.00, today, 'Partial payment - cash collected']
        );
        console.log(`  Sample collection created: id=${collectionRes.rows[0].id} (PENDING)`);
      } else {
        console.log(`  Vendor ${vendorIds[0]} already has an active bill — skipping bill seed.`);
      }
    }

    await client.query('COMMIT');
    console.log('\nSeed completed successfully.');
    console.log('\nLogin credentials:');
    console.log('  Admin:       admin@crm.com       / Admin@123');
    console.log('  Collector 1: collector1@crm.com  / Collect@123');
    console.log('  Collector 2: collector2@crm.com  / Collect@123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
