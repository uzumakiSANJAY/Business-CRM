const pool = require('../config/db');

async function getDalals(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM dalals WHERE is_active = true ORDER BY name ASC');
    res.json({ dalals: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createDalal(req, res, next) {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    const result = await pool.query(
      'INSERT INTO dalals (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'CREATE_DALAL', 'dalals', result.rows[0].id, JSON.stringify({ name })]
    );
    res.status(201).json({ dalal: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Dalal already exists' });
    next(err);
  }
}

async function updateDalal(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const existing = await pool.query('SELECT id FROM dalals WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Dalal not found' });
    const result = await pool.query(
      'UPDATE dalals SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );
    res.json({ dalal: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Dalal already exists' });
    next(err);
  }
}

async function deleteDalal(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM dalals WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Dalal not found' });
    await pool.query('UPDATE dalals SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Dalal removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDalals, createDalal, updateDalal, deleteDalal };
