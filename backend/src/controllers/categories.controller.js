const pool = require('../config/db');

async function getCategories(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE is_active = true ORDER BY name ASC'
    );
    res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description || null]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'CREATE_CATEGORY', 'categories', result.rows[0].id, JSON.stringify({ name })]
    );
    res.status(201).json({ category: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Category name already exists' });
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const existing = await pool.query('SELECT id FROM categories WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Category not found' });

    const result = await pool.query(
      `UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *`,
      [name ? name.trim() : null, description !== undefined ? description : null, id]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'UPDATE_CATEGORY', 'categories', parseInt(id), JSON.stringify(req.body)]
    );
    res.json({ category: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Category name already exists' });
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id, name FROM categories WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Category not found' });

    await pool.query('UPDATE categories SET is_active = false WHERE id = $1', [id]);
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'DELETE_CATEGORY', 'categories', parseInt(id), JSON.stringify({ name: existing.rows[0].name })]
    );
    res.json({ message: 'Category deactivated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
