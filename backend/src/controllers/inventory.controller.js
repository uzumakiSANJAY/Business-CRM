const pool = require('../config/db');

const stockQuery = `
  SELECT
    ii.id,
    ii.name,
    ii.type,
    ii.unit,
    ii.item_id,
    ii.item_company_id,
    ii.item_type_id,
    ii.created_at,
    i.name   AS item_name,
    ic.name  AS item_company_name,
    it.name  AS item_type_name,
    u.name   AS created_by_name,
    COALESCE(SUM(CASE WHEN il.direction = 'INWARD'  THEN il.quantity END), 0)::float8  AS total_inward,
    COALESCE(SUM(CASE WHEN il.direction = 'OUTWARD' THEN il.quantity END), 0)::float8  AS total_outward,
    COALESCE(SUM(CASE WHEN il.direction = 'INWARD'  THEN il.quantity
                      WHEN il.direction = 'OUTWARD' THEN -il.quantity END), 0)::float8 AS current_stock
  FROM inventory_items ii
  LEFT JOIN inventory_ledger  il ON il.item_id = ii.id
  LEFT JOIN items             i  ON i.id  = ii.item_id
  LEFT JOIN item_companies    ic ON ic.id = ii.item_company_id
  LEFT JOIN item_types        it ON it.id = ii.item_type_id
  LEFT JOIN users             u  ON u.id  = ii.created_by
  WHERE ii.is_active = true
`;

async function getInventoryItems(req, res, next) {
  try {
    const { type } = req.query;
    let sql = stockQuery;
    const params = [];
    if (type) {
      params.push(type.toUpperCase());
      sql += ` AND ii.type = $${params.length}`;
    }
    sql += ' GROUP BY ii.id, i.name, ic.name, it.name, u.name ORDER BY ii.type, ii.name';
    const result = await pool.query(sql, params);
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createInventoryItem(req, res, next) {
  try {
    const { name, type, unit, item_id, item_company_id, item_type_id } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'name and type are required' });
    if (!['PACKED', 'LOOSE'].includes(type)) return res.status(400).json({ message: 'type must be PACKED or LOOSE' });

    const result = await pool.query(
      `INSERT INTO inventory_items (name, type, unit, item_id, item_company_id, item_type_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        name.trim(),
        type,
        (unit || 'pcs').trim(),
        item_id   || null,
        item_company_id || null,
        item_type_id    || null,
        req.user.id,
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'CREATE_INVENTORY_ITEM', 'inventory_items', $2, $3)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ name, type })]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
}

async function updateInventoryItem(req, res, next) {
  try {
    const { id } = req.params;
    const { name, unit } = req.body;

    const existing = await pool.query('SELECT id FROM inventory_items WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Item not found' });

    await pool.query(
      `UPDATE inventory_items
          SET name = COALESCE($1, name),
              unit = COALESCE($2, unit)
        WHERE id = $3`,
      [name ? name.trim() : null, unit ? unit.trim() : null, id]
    );

    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
}

async function deleteInventoryItem(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id, name FROM inventory_items WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Item not found' });

    await pool.query('UPDATE inventory_items SET is_active = false WHERE id = $1', [id]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'DELETE_INVENTORY_ITEM', 'inventory_items', $2, $3)`,
      [req.user.id, parseInt(id), JSON.stringify({ name: existing.rows[0].name })]
    );

    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

async function getItemLedger(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT il.*, u.name AS created_by_name, v.name AS vendor_name
         FROM inventory_ledger il
         LEFT JOIN users   u ON u.id = il.created_by
         LEFT JOIN vendors v ON v.id = il.vendor_id
        WHERE il.item_id = $1
        ORDER BY il.txn_date DESC, il.created_at DESC`,
      [id]
    );
    res.json({ ledger: result.rows });
  } catch (err) {
    next(err);
  }
}

async function addTransaction(req, res, next) {
  try {
    const { item_id, direction, quantity, txn_date, notes, rate, vendor_id, txn_type } = req.body;
    if (!item_id || !direction || !quantity || !txn_date) {
      return res.status(400).json({ message: 'item_id, direction, quantity, txn_date are required' });
    }
    if (!['INWARD', 'OUTWARD'].includes(direction)) {
      return res.status(400).json({ message: 'direction must be INWARD or OUTWARD' });
    }
    if (parseFloat(quantity) <= 0) {
      return res.status(400).json({ message: 'quantity must be positive' });
    }

    const itemCheck = await pool.query('SELECT id FROM inventory_items WHERE id = $1 AND is_active = true', [item_id]);
    if (!itemCheck.rows.length) return res.status(404).json({ message: 'Inventory item not found' });

    const result = await pool.query(
      `INSERT INTO inventory_ledger (item_id, direction, quantity, txn_date, notes, rate, vendor_id, txn_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [item_id, direction, parseFloat(quantity), txn_date, notes || null,
       rate ? parseFloat(rate) : null, vendor_id || null, txn_type || 'MANUAL', req.user.id]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const { id } = req.params;
    const { direction, quantity, txn_date, notes, rate, vendor_id } = req.body;
    if (direction && !['INWARD', 'OUTWARD'].includes(direction)) {
      return res.status(400).json({ message: 'direction must be INWARD or OUTWARD' });
    }
    if (quantity !== undefined && parseFloat(quantity) <= 0) {
      return res.status(400).json({ message: 'quantity must be positive' });
    }
    const existing = await pool.query('SELECT id FROM inventory_ledger WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Transaction not found' });

    await pool.query(
      `UPDATE inventory_ledger
          SET direction = COALESCE($1, direction),
              quantity  = COALESCE($2, quantity),
              txn_date  = COALESCE($3, txn_date),
              notes     = $4,
              rate      = $5,
              vendor_id = $6
        WHERE id = $7`,
      [direction || null, quantity ? parseFloat(quantity) : null, txn_date || null,
       notes ?? null, rate ? parseFloat(rate) : null, vendor_id || null, id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM inventory_ledger WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Transaction not found' });
    await pool.query('DELETE FROM inventory_ledger WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getItemLedger,
  addTransaction,
  updateTransaction,
  deleteTransaction,
};
