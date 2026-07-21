const pool = require('../config/db');

const stockQuery = `
  SELECT
    lct.id, lct.name, lct.capacity_litres, lct.created_at,
    u.name AS created_by_name,
    COALESCE(SUM(CASE WHEN lcl.direction = 'INWARD'  THEN lcl.quantity END), 0)::float8 AS total_filled,
    COALESCE(SUM(CASE WHEN lcl.direction = 'OUTWARD' THEN lcl.quantity END), 0)::float8 AS total_sold,
    COALESCE(SUM(CASE WHEN lcl.direction = 'INWARD'  THEN  lcl.quantity
                      WHEN lcl.direction = 'OUTWARD' THEN -lcl.quantity END), 0)::float8 AS current_stock
  FROM loose_container_types lct
  LEFT JOIN loose_container_ledger lcl ON lcl.container_type_id = lct.id
  LEFT JOIN users u ON u.id = lct.created_by
  WHERE lct.is_active = true
`;

async function getContainerTypes(req, res, next) {
  try {
    const result = await pool.query(`${stockQuery} GROUP BY lct.id, u.name ORDER BY lct.name`);
    res.json({ types: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createContainerType(req, res, next) {
  try {
    const { name, capacity_litres } = req.body;
    if (!name || !capacity_litres) return res.status(400).json({ message: 'Name and capacity are required' });
    if (parseFloat(capacity_litres) <= 0) return res.status(400).json({ message: 'Capacity must be greater than 0' });

    const result = await pool.query(
      `INSERT INTO loose_container_types (name, capacity_litres, created_by) VALUES ($1, $2, $3) RETURNING id`,
      [name.trim(), parseFloat(capacity_litres), req.user.id]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
}

async function updateContainerType(req, res, next) {
  try {
    const { id } = req.params;
    const { name, capacity_litres } = req.body;
    const existing = await pool.query('SELECT id FROM loose_container_types WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Container type not found' });

    await pool.query(
      `UPDATE loose_container_types
       SET name = COALESCE($1, name), capacity_litres = COALESCE($2, capacity_litres)
       WHERE id = $3`,
      [name?.trim() || null, capacity_litres ? parseFloat(capacity_litres) : null, id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteContainerType(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM loose_container_types WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Container type not found' });
    await pool.query('UPDATE loose_container_types SET is_active = false WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// Atomic: OUTWARD from bulk stock + INWARD to container stock
async function containerise(req, res, next) {
  const client = await pool.connect();
  try {
    const { item_id, container_type_id, num_containers, txn_date, notes } = req.body;
    if (!item_id || !container_type_id || !num_containers) {
      return res.status(400).json({ message: 'item_id, container_type_id and num_containers are required' });
    }
    const numCont = parseFloat(num_containers);
    if (numCont <= 0) return res.status(400).json({ message: 'num_containers must be > 0' });

    // Fetch container capacity
    const ctRes = await client.query(
      'SELECT id, name, capacity_litres FROM loose_container_types WHERE id = $1 AND is_active = true',
      [container_type_id]
    );
    if (!ctRes.rows.length) return res.status(404).json({ message: 'Container type not found' });
    const ct = ctRes.rows[0];
    const litresNeeded = numCont * parseFloat(ct.capacity_litres);

    // Check bulk stock availability
    const stockRes = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN direction='INWARD' THEN quantity WHEN direction='OUTWARD' THEN -quantity END), 0)::float8 AS stock
       FROM inventory_ledger WHERE item_id = $1`,
      [item_id]
    );
    const currentStock = parseFloat(stockRes.rows[0].stock);
    if (litresNeeded > currentStock) {
      return res.status(400).json({
        message: `Insufficient bulk stock. Need ${litresNeeded.toFixed(3)} but only ${currentStock.toFixed(3)} available.`,
      });
    }

    const date = txn_date || new Date().toISOString().slice(0, 10);
    const autoNote = notes || `Containerised into ${numCont} × ${ct.name}`;

    await client.query('BEGIN');

    // 1) OUTWARD from bulk inventory_ledger
    await client.query(
      `INSERT INTO inventory_ledger (item_id, direction, quantity, txn_date, txn_type, notes, created_by)
       VALUES ($1, 'OUTWARD', $2, $3, 'CONTAINERISE', $4, $5)`,
      [item_id, litresNeeded, date, autoNote, req.user.id]
    );

    // 2) INWARD to container loose_container_ledger
    await client.query(
      `INSERT INTO loose_container_ledger (container_type_id, direction, quantity, txn_date, source_item_id, txn_type, notes, created_by)
       VALUES ($1, 'INWARD', $2, $3, $4, 'FILL', $5, $6)`,
      [container_type_id, numCont, date, item_id, `Filled from bulk — ${litresNeeded.toFixed(3)} litres used`, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ ok: true, litres_used: litresNeeded, containers_added: numCont });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function sellContainers(req, res, next) {
  try {
    const { container_type_id, quantity, rate, txn_date, vendor_id, notes } = req.body;
    if (!container_type_id || !quantity) {
      return res.status(400).json({ message: 'container_type_id and quantity are required' });
    }
    const qty = parseFloat(quantity);
    if (qty <= 0) return res.status(400).json({ message: 'Quantity must be > 0' });

    // Check container stock
    const stockRes = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN direction='INWARD' THEN quantity WHEN direction='OUTWARD' THEN -quantity END), 0)::float8 AS stock
       FROM loose_container_ledger WHERE container_type_id = $1`,
      [container_type_id]
    );
    const currentStock = parseFloat(stockRes.rows[0].stock);
    if (qty > currentStock) {
      return res.status(400).json({
        message: `Insufficient container stock. Have ${currentStock} but trying to sell ${qty}.`,
      });
    }

    const date = txn_date || new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO loose_container_ledger (container_type_id, direction, quantity, rate, txn_date, vendor_id, txn_type, notes, created_by)
       VALUES ($1, 'OUTWARD', $2, $3, $4, $5, 'SALE', $6, $7)`,
      [container_type_id, qty, rate || null, date, vendor_id || null, notes || null, req.user.id]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function getContainerLedger(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT lcl.*,
              v.name  AS vendor_name,
              u.name  AS created_by_name,
              ii.name AS source_item_name
       FROM loose_container_ledger lcl
       LEFT JOIN vendors         v  ON v.id  = lcl.vendor_id
       LEFT JOIN users           u  ON u.id  = lcl.created_by
       LEFT JOIN inventory_items ii ON ii.id = lcl.source_item_id
       WHERE lcl.container_type_id = $1
       ORDER BY lcl.txn_date DESC, lcl.created_at DESC`,
      [id]
    );
    res.json({ ledger: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getContainerTypes, createContainerType, updateContainerType, deleteContainerType,
  containerise, sellContainers, getContainerLedger,
};
