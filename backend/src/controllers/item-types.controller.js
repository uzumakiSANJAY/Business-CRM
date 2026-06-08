const pool = require('../config/db');

async function getTypes(req, res, next) {
  try {
    const { item_company_id } = req.query;
    const where = ['t.is_active = true'];
    const params = [];
    if (item_company_id) { params.push(item_company_id); where.push(`t.item_company_id = $${params.length}`); }

    const result = await pool.query(
      `SELECT t.*, c.name AS company_name, c.item_id AS item_id
       FROM item_types t
       JOIN item_companies c ON t.item_company_id = c.id
       WHERE ${where.join(' AND ')}
       ORDER BY t.name ASC`,
      params
    );
    res.json({ types: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createType(req, res, next) {
  try {
    const { item_company_id, name } = req.body;
    if (!item_company_id || !name?.trim()) return res.status(400).json({ message: 'Company and name are required' });
    const result = await pool.query(
      'INSERT INTO item_types (item_company_id, name) VALUES ($1,$2) RETURNING *',
      [item_company_id, name.trim()]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'CREATE_ITEM_TYPE', 'item_types', result.rows[0].id, JSON.stringify({ item_company_id, name })]
    );
    res.status(201).json({ type: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Type already exists for this company' });
    next(err);
  }
}

async function updateType(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const existing = await pool.query('SELECT id FROM item_types WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Type not found' });
    const result = await pool.query(
      'UPDATE item_types SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );
    res.json({ type: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Type already exists for this company' });
    next(err);
  }
}

async function deleteType(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM item_types WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Type not found' });
    await pool.query('UPDATE item_types SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Type removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTypes, createType, updateType, deleteType };
