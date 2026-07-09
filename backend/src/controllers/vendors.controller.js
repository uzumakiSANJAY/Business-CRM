const pool = require('../config/db');
const { getAlertFlag, getDaysPending } = require('../services/alert.service');
const { getOutstanding } = require('../services/balance.service');

/**
 * GET /api/vendors
 * Returns all active vendors with their active bill info, alert_flag, and outstanding balance.
 */
async function getVendors(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        v.id,
        v.name,
        v.contact_person,
        v.phone,
        v.address,
        v.route,
        v.category_id,
        cat.name AS category_name,
        v.created_at,
        (
          SELECT json_agg(
            json_build_object(
              'id',                  b.id,
              'amount',              b.amount::float8,
              'bill_type',           b.bill_type,
              'generated_date',      b.generated_date,
              'confirmed_collected', COALESCE(
                (SELECT SUM(c.amount)::float8
                   FROM collections c
                  WHERE c.bill_id = b.id AND c.status = 'CONFIRMED'),
                0
              )
            ) ORDER BY b.generated_date DESC
          )
          FROM bills b
          WHERE b.vendor_id = v.id AND b.status = 'ACTIVE'
        ) AS active_bills_json
      FROM vendors v
      LEFT JOIN categories cat ON cat.id = v.category_id
      WHERE v.is_active = true
      ORDER BY v.sort_order ASC NULLS LAST, v.name ASC
    `);

    const ALERT_PRIORITY = { CRIT: 3, WARN: 2, OK: 1, DONE: 0 };

    const vendors = result.rows.map((row) => {
      const activeBills = (row.active_bills_json || []).map((b) => {
        const outstanding = Math.max(0, parseFloat(b.amount) - parseFloat(b.confirmed_collected));
        return {
          id: b.id,
          amount: parseFloat(b.amount),
          bill_type: b.bill_type || 'CASH',
          generated_date: b.generated_date,
          status: 'ACTIVE',
          outstanding,
          alert_flag: getAlertFlag(b.generated_date, 'ACTIVE'),
          days_pending: getDaysPending(b.generated_date),
        };
      });

      const totalOutstanding = activeBills.reduce((sum, b) => sum + b.outstanding, 0);
      const worstFlag = activeBills.reduce((worst, b) =>
        (ALERT_PRIORITY[b.alert_flag] || 0) > (ALERT_PRIORITY[worst] || 0) ? b.alert_flag : worst,
        null
      );

      return {
        id: row.id,
        name: row.name,
        contact_person: row.contact_person,
        phone: row.phone,
        address: row.address,
        route: row.route,
        category_id: row.category_id,
        category_name: row.category_name,
        created_at: row.created_at,
        active_bills: activeBills,
        active_bill: activeBills[0] || null,
        outstanding: activeBills.length > 0 ? totalOutstanding : null,
        alert_flag: worstFlag,
      };
    });

    res.json({ vendors });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/vendors/:id
 * Single vendor with full bill history and collections per bill.
 */
async function getVendorById(req, res, next) {
  try {
    const { id } = req.params;

    const vendorRes = await pool.query(
      `SELECT v.*, cat.name AS category_name
       FROM vendors v
       LEFT JOIN categories cat ON cat.id = v.category_id
       WHERE v.id = $1 AND v.is_active = true`,
      [id]
    );

    if (!vendorRes.rows.length) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const vendor = vendorRes.rows[0];

    // Fetch bill history with collection summaries
    const billsRes = await pool.query(`
      SELECT
        b.id,
        b.amount,
        b.generated_date,
        b.status,
        b.created_at,
        u.name              AS generated_by_name,
        COALESCE(
          (SELECT SUM(c.amount)
             FROM collections c
            WHERE c.bill_id = b.id AND c.status = 'CONFIRMED'),
          0
        )                   AS confirmed_collected
      FROM bills b
      LEFT JOIN users u ON u.id = b.generated_by
      WHERE b.vendor_id = $1
      ORDER BY b.created_at DESC
    `, [id]);

    const billIds = billsRes.rows.map((b) => b.id);

    // Fetch all collections for this vendor's bills
    let collectionsMap = {};
    if (billIds.length) {
      const collRes = await pool.query(`
        SELECT
          c.*,
          u.name AS collector_name,
          adm.name AS confirmed_by_name
        FROM collections c
        JOIN users u ON u.id = c.collector_id
        LEFT JOIN users adm ON adm.id = c.confirmed_by
        WHERE c.bill_id = ANY($1::int[])
        ORDER BY c.submitted_at DESC
      `, [billIds]);

      for (const col of collRes.rows) {
        if (!collectionsMap[col.bill_id]) collectionsMap[col.bill_id] = [];
        collectionsMap[col.bill_id].push(col);
      }
    }

    const bills = billsRes.rows.map((b) => {
      const outstanding = Math.max(
        0,
        parseFloat(b.amount) - parseFloat(b.confirmed_collected)
      );
      return {
        id: b.id,
        amount: parseFloat(b.amount),
        generated_date: b.generated_date,
        status: b.status,
        created_at: b.created_at,
        generated_by_name: b.generated_by_name,
        outstanding,
        alert_flag: getAlertFlag(b.generated_date, b.status),
        days_pending: getDaysPending(b.generated_date),
        collections: collectionsMap[b.id] || [],
      };
    });

    res.json({ vendor: { ...vendor, bills } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/vendors
 * ADMIN only. Create a new vendor.
 */
async function createVendor(req, res, next) {
  try {
    const { name, contact_person, phone, address, route, category_id } = req.body;

    const result = await pool.query(
      `INSERT INTO vendors (name, contact_person, phone, address, route, category_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name.trim(), contact_person || null, phone || null, address || null, route || null, category_id || null, req.user.id]
    );

    const vendor = result.rows[0];

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'CREATE_VENDOR', 'vendors', vendor.id, JSON.stringify({ name: vendor.name })]
    );

    res.status(201).json({ vendor });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/vendors/:id
 * ADMIN only. Update vendor details.
 */
async function updateVendor(req, res, next) {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, address, route, category_id } = req.body;

    const existing = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND is_active = true',
      [id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const result = await pool.query(
      `UPDATE vendors
          SET name           = COALESCE($1, name),
              contact_person = COALESCE($2, contact_person),
              phone          = COALESCE($3, phone),
              address        = COALESCE($4, address),
              route          = COALESCE($5, route),
              category_id    = COALESCE($6, category_id)
        WHERE id = $7
        RETURNING *`,
      [
        name ? name.trim() : null,
        contact_person !== undefined ? contact_person : null,
        phone !== undefined ? phone : null,
        address !== undefined ? address : null,
        route !== undefined ? route : null,
        category_id !== undefined ? category_id : null,
        id,
      ]
    );

    const vendor = result.rows[0];

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'UPDATE_VENDOR', 'vendors', vendor.id, JSON.stringify(req.body)]
    );

    res.json({ vendor });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/vendors/:id
 * ADMIN only. Soft delete (is_active = false).
 */
async function deleteVendor(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id, name FROM vendors WHERE id = $1 AND is_active = true',
      [id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await pool.query(
      'UPDATE vendors SET is_active = false WHERE id = $1',
      [id]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'DELETE_VENDOR', 'vendors', parseInt(id), JSON.stringify({ name: existing.rows[0].name })]
    );

    res.json({ message: 'Vendor deactivated successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/vendors/reorder
 * ADMIN only. Accepts { ids: [3,1,4,2,5] } and sets sort_order accordingly.
 */
async function reorderVendors(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array required' });
    }
    // Update each vendor's sort_order based on position in ids array
    await Promise.all(
      ids.map((id, index) =>
        pool.query('UPDATE vendors SET sort_order = $1 WHERE id = $2', [index + 1, id])
      )
    );
    res.json({ message: 'Order saved' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/vendors/bulk-upload
 * ADMIN only. Import vendors from a JSON array parsed from Excel on the client.
 * Rules:
 *   - Vendor name exists (case-insensitive) → skip (keep existing)
 *   - Vendor name not found → create new vendor
 *   - Route name matches existing route → use it
 *   - Route name not found → create the route then use it
 *   - Category name matches existing → link; otherwise leave null
 */
async function bulkUploadVendors(req, res, next) {
  const client = await pool.connect();
  try {
    const rows = req.body.vendors;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No vendor rows provided' });
    }

    await client.query('BEGIN');

    // Load existing vendors
    const existingVendors = await client.query('SELECT LOWER(name) AS lname FROM vendors');
    const existingNames = new Set(existingVendors.rows.map((r) => r.lname));

    // Load existing routes
    const existingRoutesRes = await client.query('SELECT id, name, LOWER(name) AS lname FROM routes WHERE is_active = true');
    const routeMap = {}; // lower → { id, name }
    existingRoutesRes.rows.forEach((r) => { routeMap[r.lname] = { id: r.id, name: r.name }; });

    // Load existing categories
    const existingCatsRes = await client.query('SELECT id, LOWER(name) AS lname FROM categories');
    const catMap = {};
    existingCatsRes.rows.forEach((r) => { catMap[r.lname] = r.id; });

    let created = 0;
    let skipped = 0;
    const skippedNames = [];
    const createdNames = [];

    for (const row of rows) {
      const name = (row['Vendor Name'] || row.name || '').trim();
      if (!name) { skipped++; continue; }

      if (existingNames.has(name.toLowerCase())) {
        skipped++;
        skippedNames.push(name);
        continue;
      }

      // Resolve route — create if not found
      const routeRaw = (row['Route'] || row.route || '').trim();
      let routeValue = null;
      if (routeRaw) {
        const lRoute = routeRaw.toLowerCase();
        if (routeMap[lRoute]) {
          routeValue = routeMap[lRoute].name;
        } else {
          const nr = await client.query(
            `INSERT INTO routes (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name`,
            [routeRaw]
          );
          routeMap[lRoute] = { id: nr.rows[0].id, name: nr.rows[0].name };
          routeValue = nr.rows[0].name;
        }
      }

      // Resolve category
      const catRaw = (row['Category'] || row.category || '').trim();
      const categoryId = catRaw ? (catMap[catRaw.toLowerCase()] || null) : null;

      const ins = await client.query(
        `INSERT INTO vendors (name, route, created_by)
         VALUES ($1, $2, $3) RETURNING id`,
        [name, routeValue, req.user.id]
      );

      existingNames.add(name.toLowerCase());
      created++;
      createdNames.push(name);

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES ($1, 'BULK_CREATE_VENDOR', 'vendors', $2, $3)`,
        [req.user.id, ins.rows[0].id, JSON.stringify({ name, route: routeValue })]
      );
    }

    await client.query('COMMIT');
    res.json({ created, skipped, createdNames, skippedNames });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { getVendors, getVendorById, createVendor, updateVendor, deleteVendor, reorderVendors, bulkUploadVendors };
