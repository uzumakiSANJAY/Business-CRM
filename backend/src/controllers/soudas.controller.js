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
         s.vendor_id, s.item_id, s.dalal_id, s.item_company_id, s.item_type_id,
         s.created_by,
         v.name AS vendor_name,
         i.name AS item_name,
         d.name AS dalal_name,
         c.name AS item_company_name,
         t.name AS item_type_name,
         u.name AS created_by_name,
         COALESCE(SUM(sd.qty_delivered), 0)::numeric AS total_delivered,
         (s.qty_ordered - COALESCE(SUM(sd.qty_delivered), 0))::numeric AS balance
       FROM soudas s
       JOIN vendors v ON s.vendor_id = v.id
       JOIN items   i ON s.item_id   = i.id
       LEFT JOIN dalals d ON s.dalal_id = d.id
       LEFT JOIN item_companies c ON s.item_company_id = c.id
       LEFT JOIN item_types t ON s.item_type_id = t.id
       LEFT JOIN users u ON s.created_by = u.id
       LEFT JOIN souda_deliveries sd ON s.id = sd.souda_id
       WHERE ${where.join(' AND ')}
       GROUP BY s.id, v.name, i.name, d.name, c.name, t.name, u.name
       ORDER BY s.order_date DESC, s.id DESC`,
      params
    );

    const soudaIds = result.rows.map((r) => r.id);
    let deliveries = [];
    if (soudaIds.length > 0) {
      const delRes = await pool.query(
        `SELECT * FROM souda_deliveries WHERE souda_id = ANY($1) ORDER BY delivery_date ASC, trip_number ASC NULLS LAST, trip_time ASC NULLS LAST, id ASC`,
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
    const { order_date, vendor_id, item_id, qty_ordered, rate, location, dalal_id, item_company_id, item_type_id, notes } = req.body;
    if (!vendor_id || !item_id || !qty_ordered || !rate) {
      return res.status(400).json({ message: 'Party, item, quantity and rate are required' });
    }
    // Collectors can only create orders for today's date
    const todayStr = new Date().toISOString().slice(0, 10);
    const finalDate = req.user.role === 'COLLECTOR' ? todayStr : (order_date || todayStr);

    const result = await pool.query(
      `INSERT INTO soudas (order_date, vendor_id, item_id, qty_ordered, rate, location, dalal_id, item_company_id, item_type_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [finalDate, vendor_id, item_id, qty_ordered, rate,
       location || null, dalal_id || null, item_company_id || null, item_type_id || null, notes || null, req.user.id]
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
    const { order_date, vendor_id, item_id, qty_ordered, rate, location, dalal_id, item_company_id, item_type_id, notes } = req.body;
    const existing = await pool.query('SELECT id, created_by, order_date FROM soudas WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Souda not found' });

    // Collectors can only edit their own orders placed today
    if (req.user.role === 'COLLECTOR') {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (String(existing.rows[0].created_by) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only edit your own orders' });
      }
      if (String(existing.rows[0].order_date).slice(0, 10) !== todayStr) {
        return res.status(403).json({ message: 'You can only edit today\'s orders' });
      }
    }

    // Collectors cannot change the date
    const finalDate = req.user.role === 'COLLECTOR'
      ? existing.rows[0].order_date
      : (order_date || existing.rows[0].order_date);

    const result = await pool.query(
      `UPDATE soudas SET order_date=$1, vendor_id=$2, item_id=$3, qty_ordered=$4, rate=$5,
       location=$6, dalal_id=$7, item_company_id=$8, item_type_id=$9, notes=$10 WHERE id=$11 RETURNING *`,
      [finalDate, vendor_id, item_id, qty_ordered, rate,
       location || null, dalal_id || null, item_company_id || null, item_type_id || null, notes || null, id]
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
    const { delivery_date, qty_delivered, car_number, notes, trip_number, trip_time } = req.body;
    if (!delivery_date || !qty_delivered) {
      return res.status(400).json({ message: 'Delivery date and quantity are required' });
    }

    const souda = await pool.query('SELECT id, qty_ordered FROM soudas WHERE id = $1', [id]);
    if (!souda.rows.length) return res.status(404).json({ message: 'Souda not found' });

    const result = await pool.query(
      `INSERT INTO souda_deliveries (souda_id, delivery_date, qty_delivered, car_number, notes, trip_number, trip_time, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, delivery_date, qty_delivered, car_number || null, notes || null, trip_number ? parseInt(trip_number) : 1, trip_time || null, req.user.id]
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
