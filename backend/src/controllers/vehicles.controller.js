const pool = require('../config/db');

async function getVehicles(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM vehicles WHERE is_active = true ORDER BY name ASC');
    res.json({ vehicles: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createVehicle(req, res, next) {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    const result = await pool.query(
      'INSERT INTO vehicles (name) VALUES ($1) RETURNING *',
      [name.trim().toUpperCase()]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'CREATE_VEHICLE', 'vehicles', result.rows[0].id, JSON.stringify({ name })]
    );
    res.status(201).json({ vehicle: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Vehicle already exists' });
    next(err);
  }
}

async function updateVehicle(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const existing = await pool.query('SELECT id FROM vehicles WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Vehicle not found' });
    const result = await pool.query(
      'UPDATE vehicles SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim().toUpperCase(), id]
    );
    res.json({ vehicle: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Vehicle already exists' });
    next(err);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM vehicles WHERE id = $1 AND is_active = true', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Vehicle not found' });
    await pool.query('UPDATE vehicles SET is_active = false WHERE id = $1', [id]);
    res.json({ message: 'Vehicle removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getVehicles, createVehicle, updateVehicle, deleteVehicle };
