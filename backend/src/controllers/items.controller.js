const pool = require('../config/db');

async function getItems(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM items WHERE is_active = true ORDER BY name ASC');
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    const result = await pool.query(
      'INSERT INTO items (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'CREATE_ITEM', 'items', result.rows[0].id, JSON.stringify({ name })]
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Item already exists' });
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const existing = await pool.query('SELECT id FROM items WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Item not found' });
    const result = await pool.query(
      'UPDATE items SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );
    res.json({ item: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Item already exists' });
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM items WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Item not found' });
    await pool.query('UPDATE items SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Item removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getItems, createItem, updateItem, deleteItem };
