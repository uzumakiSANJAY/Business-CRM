const pool = require('../config/db');

async function getSoudas(req, res, next) {
  try {
    const { vendor_id, dalal_id, from_date, to_date } = req.query;

    let where = ['1=1'];
    const params = [];

    if (vendor_id) { params.push(vendor_id); where.push(`s.vendor_id = $${params.length}`); }
    if (dalal_id)  { params.push(dalal_id);  where.push(`s.dalal_id = $${params.length}`); }
    if (from_date) { params.push(from_date); where.push(`s.order_date >= $${params.length}`); }
    if (to_date)   { params.push(to_date);   where.push(`s.order_date <= $${params.length}`); }

    const result = await pool.query(
      `SELECT
         s.id, s.order_date, s.qty_ordered, s.rate, s.location, s.notes, s.created_at,
         s.vendor_id, s.item_id, s.dalal_id,
         v.name AS vendor_name,
         i.name AS item_name,
         d.name AS dalal_name,
         COALESCE(SUM(sd.qty_delivered), 0)::numeric AS total_delivered,
         (s.qty_ordered - COALESCE(SUM(sd.qty_delivered), 0))::numeric AS balance
       FROM soudas s
       JOIN vendors v ON s.vendor_id = v.id
       JOIN items   i ON s.item_id   = i.id
       LEFT JOIN dalals d ON s.dalal_id = d.id
       LEFT JOIN souda_deliveries sd ON s.id = sd.souda_id
       WHERE ${where.join(' AND ')}
       GROUP BY s.id, v.name, i.name, d.name
       ORDER BY s.order_date DESC, s.id DESC`,
      params
    );

    const soudaIds = result.rows.map((r) => r.id);
    let deliveries = [];
    if (soudaIds.length > 0) {
      const delRes = await pool.query(
        `SELECT * FROM souda_deliveries WHERE souda_id = ANY($1) ORDER BY delivery_date ASC, id ASC`,
        [soudaIds]
      );
      deliveries = delRes.rows;
    }

    const soudas = result.rows.map((s) => ({
      ...s,
      deliveries: deliveries.filter((d) => d.souda_id === s.id),
    }));

    res.json({ soudas });
  } catch (err) {
    next(err);
  }
}

async function createSouda(req, res, next) {
  try {
    const { order_date, vendor_id, item_id, qty_ordered, rate, location, dalal_id, notes } = req.body;
    if (!vendor_id || !item_id || !qty_ordered || !rate) {
      return res.status(400).json({ message: 'Party, item, quantity and rate are required' });
    }
    const result = await pool.query(
      `INSERT INTO soudas (order_date, vendor_id, item_id, qty_ordered, rate, location, dalal_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [order_date || new Date().toISOString().slice(0, 10), vendor_id, item_id, qty_ordered, rate,
       location || null, dalal_id || null, notes || null, req.user.id]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'CREATE_SOUDA', 'soudas', result.rows[0].id, JSON.stringify(req.body)]
    );
    res.status(201).json({ souda: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateSouda(req, res, next) {
  try {
    const { id } = req.params;
    const { order_date, vendor_id, item_id, qty_ordered, rate, location, dalal_id, notes } = req.body;
    const existing = await pool.query('SELECT id FROM soudas WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Souda not found' });

    const result = await pool.query(
      `UPDATE soudas SET order_date=$1, vendor_id=$2, item_id=$3, qty_ordered=$4, rate=$5,
       location=$6, dalal_id=$7, notes=$8 WHERE id=$9 RETURNING *`,
      [order_date, vendor_id, item_id, qty_ordered, rate,
       location || null, dalal_id || null, notes || null, id]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'UPDATE_SOUDA', 'soudas', parseInt(id), JSON.stringify(req.body)]
    );
    res.json({ souda: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteSouda(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM soudas WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Souda not found' });
    await pool.query('DELETE FROM soudas WHERE id = $1', [id]);
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'DELETE_SOUDA', 'soudas', parseInt(id), JSON.stringify({})]
    );
    res.json({ message: 'Souda deleted' });
  } catch (err) {
    next(err);
  }
}

async function addDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const { delivery_date, qty_delivered, notes } = req.body;
    if (!delivery_date || !qty_delivered) {
      return res.status(400).json({ message: 'Delivery date and quantity are required' });
    }

    const souda = await pool.query('SELECT id, qty_ordered FROM soudas WHERE id = $1', [id]);
    if (!souda.rows.length) return res.status(404).json({ message: 'Souda not found' });

    const delCount = await pool.query(
      'SELECT COUNT(*) FROM souda_deliveries WHERE souda_id = $1', [id]
    );
    if (parseInt(delCount.rows[0].count) >= 3) {
      return res.status(400).json({ message: 'Maximum 3 deliveries allowed per order' });
    }

    const result = await pool.query(
      `INSERT INTO souda_deliveries (souda_id, delivery_date, qty_delivered, notes, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, delivery_date, qty_delivered, notes || null, req.user.id]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'ADD_DELIVERY', 'souda_deliveries', result.rows[0].id, JSON.stringify({ souda_id: id, qty_delivered })]
    );
    res.status(201).json({ delivery: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteDelivery(req, res, next) {
  try {
    const { id, deliveryId } = req.params;
    const existing = await pool.query(
      'SELECT id FROM souda_deliveries WHERE id = $1 AND souda_id = $2', [deliveryId, id]
    );
    if (!existing.rows.length) return res.status(404).json({ message: 'Delivery not found' });
    await pool.query('DELETE FROM souda_deliveries WHERE id = $1', [deliveryId]);
    res.json({ message: 'Delivery removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSoudas, createSouda, updateSouda, deleteSouda, addDelivery, deleteDelivery };
