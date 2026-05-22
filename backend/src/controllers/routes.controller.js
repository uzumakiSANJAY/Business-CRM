const pool = require('../config/db');

async function getRoutes(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM routes WHERE is_active = true ORDER BY name ASC'
    );
    res.json({ routes: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createRoute(req, res, next) {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      'INSERT INTO routes (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description || null]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'CREATE_ROUTE', 'routes', result.rows[0].id, JSON.stringify({ name })]
    );
    res.status(201).json({ route: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Route name already exists' });
    next(err);
  }
}

async function updateRoute(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const existing = await pool.query('SELECT id FROM routes WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Route not found' });

    const result = await pool.query(
      'UPDATE routes SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [name ? name.trim() : null, description !== undefined ? description : null, id]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'UPDATE_ROUTE', 'routes', parseInt(id), JSON.stringify(req.body)]
    );
    res.json({ route: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Route name already exists' });
    next(err);
  }
}

async function deleteRoute(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id, name FROM routes WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Route not found' });

    await pool.query('UPDATE routes SET is_active = false WHERE id = $1', [id]);
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'DELETE_ROUTE', 'routes', parseInt(id), JSON.stringify({ name: existing.rows[0].name })]
    );
    res.json({ message: 'Route deactivated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getRoutes, createRoute, updateRoute, deleteRoute };
