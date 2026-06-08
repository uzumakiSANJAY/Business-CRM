const pool = require('../config/db');

async function getCompanies(req, res, next) {
  try {
    const { item_id } = req.query;
    const where = ['c.is_active = true'];
    const params = [];
    if (item_id) { params.push(item_id); where.push(`c.item_id = $${params.length}`); }

    const result = await pool.query(
      `SELECT c.*, i.name AS item_name
       FROM item_companies c
       JOIN items i ON c.item_id = i.id
       WHERE ${where.join(' AND ')}
       ORDER BY c.name ASC`,
      params
    );
    res.json({ companies: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createCompany(req, res, next) {
  try {
    const { item_id, name } = req.body;
    if (!item_id || !name?.trim()) return res.status(400).json({ message: 'Item and name are required' });
    const result = await pool.query(
      'INSERT INTO item_companies (item_id, name) VALUES ($1,$2) RETURNING *',
      [item_id, name.trim()]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'CREATE_ITEM_COMPANY', 'item_companies', result.rows[0].id, JSON.stringify({ item_id, name })]
    );
    res.status(201).json({ company: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Company already exists for this item' });
    next(err);
  }
}

async function updateCompany(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const existing = await pool.query('SELECT id FROM item_companies WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Company not found' });
    const result = await pool.query(
      'UPDATE item_companies SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );
    res.json({ company: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Company already exists for this item' });
    next(err);
  }
}

async function deleteCompany(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM item_companies WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Company not found' });
    await pool.query('UPDATE item_companies SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Company removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCompanies, createCompany, updateCompany, deleteCompany };
