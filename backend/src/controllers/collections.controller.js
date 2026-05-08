const pool = require('../config/db');
const { recalcAndMarkPaid } = require('../services/balance.service');

/**
 * GET /api/collections
 * ADMIN sees all collections. COLLECTOR sees only their own.
 * Includes vendor name, collector name, bill amount.
 */
async function getCollections(req, res, next) {
  try {
    let query;
    let params;

    if (req.user.role === 'ADMIN') {
      query = `
        SELECT
          c.id,
          c.bill_id,
          c.vendor_id,
          c.collector_id,
          c.amount,
          c.collection_date,
          c.notes,
          c.status,
          c.rejection_reason,
          c.submitted_at,
          c.confirmed_at,
          c.confirmed_by,
          v.name          AS vendor_name,
          u.name          AS collector_name,
          b.amount        AS bill_amount,
          b.generated_date,
          b.status        AS bill_status,
          adm.name        AS confirmed_by_name
        FROM collections c
        JOIN vendors v ON v.id = c.vendor_id
        JOIN users u ON u.id = c.collector_id
        JOIN bills b ON b.id = c.bill_id
        LEFT JOIN users adm ON adm.id = c.confirmed_by
        ORDER BY c.submitted_at DESC
      `;
      params = [];
    } else {
      // COLLECTOR: own collections only
      query = `
        SELECT
          c.id,
          c.bill_id,
          c.vendor_id,
          c.collector_id,
          c.amount,
          c.collection_date,
          c.notes,
          c.status,
          c.rejection_reason,
          c.submitted_at,
          c.confirmed_at,
          c.confirmed_by,
          v.name          AS vendor_name,
          u.name          AS collector_name,
          b.amount        AS bill_amount,
          b.generated_date,
          b.status        AS bill_status,
          adm.name        AS confirmed_by_name
        FROM collections c
        JOIN vendors v ON v.id = c.vendor_id
        JOIN users u ON u.id = c.collector_id
        JOIN bills b ON b.id = c.bill_id
        LEFT JOIN users adm ON adm.id = c.confirmed_by
        WHERE c.collector_id = $1
        ORDER BY c.submitted_at DESC
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json({ collections: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/collections
 * Authenticated (any role). Submit a collection for a bill.
 * Status defaults to PENDING.
 */
async function createCollection(req, res, next) {
  try {
    const { bill_id, vendor_id, amount, collection_date, notes } = req.body;

    // Verify the bill exists and is ACTIVE
    const billCheck = await pool.query(
      'SELECT id, vendor_id, status FROM bills WHERE id = $1',
      [bill_id]
    );

    if (!billCheck.rows.length) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = billCheck.rows[0];

    if (bill.status !== 'ACTIVE') {
      return res.status(400).json({ message: `Cannot submit collection for a ${bill.status.toLowerCase()} bill` });
    }

    // Verify vendor_id matches the bill's vendor
    if (bill.vendor_id !== parseInt(vendor_id)) {
      return res.status(400).json({ message: 'vendor_id does not match the bill\'s vendor' });
    }

    const result = await pool.query(
      `INSERT INTO collections (bill_id, vendor_id, collector_id, amount, collection_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [bill_id, vendor_id, req.user.id, amount, collection_date, notes || null]
    );

    const collection = result.rows[0];

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'SUBMIT_COLLECTION',
        'collections',
        collection.id,
        JSON.stringify({ bill_id, vendor_id, amount, collection_date }),
      ]
    );

    res.status(201).json({ collection });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/collections/:id/confirm
 * ADMIN only. Confirm a pending collection.
 * After confirmation, recalculate outstanding and auto-mark bill as PAID if zero.
 */
async function confirmCollection(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id, bill_id, vendor_id, status, amount FROM collections WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const collection = existing.rows[0];

    if (collection.status !== 'PENDING') {
      return res.status(400).json({
        message: `Collection is already ${collection.status.toLowerCase()} and cannot be confirmed`,
      });
    }

    const result = await pool.query(
      `UPDATE collections
          SET status = 'CONFIRMED',
              confirmed_at = NOW(),
              confirmed_by = $1
        WHERE id = $2
        RETURNING *`,
      [req.user.id, id]
    );

    const updated = result.rows[0];

    // Recalculate outstanding and auto-mark PAID if needed (RULE 3 & AUTO-PAID)
    const outstanding = await recalcAndMarkPaid(collection.bill_id);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'CONFIRM_COLLECTION',
        'collections',
        parseInt(id),
        JSON.stringify({
          bill_id: collection.bill_id,
          vendor_id: collection.vendor_id,
          amount: collection.amount,
          outstanding_after: outstanding,
        }),
      ]
    );

    res.json({ collection: updated, outstanding });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/collections/:id/reject
 * ADMIN only. Reject a pending collection with a reason.
 * RULE 5: Only Admin can reject collections.
 */
async function rejectCollection(req, res, next) {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const existing = await pool.query(
      'SELECT id, bill_id, vendor_id, status FROM collections WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const collection = existing.rows[0];

    if (collection.status !== 'PENDING') {
      return res.status(400).json({
        message: `Collection is already ${collection.status.toLowerCase()} and cannot be rejected`,
      });
    }

    const result = await pool.query(
      `UPDATE collections
          SET status = 'REJECTED',
              rejection_reason = $1
        WHERE id = $2
        RETURNING *`,
      [rejection_reason, id]
    );

    const updated = result.rows[0];

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'REJECT_COLLECTION',
        'collections',
        parseInt(id),
        JSON.stringify({ bill_id: collection.bill_id, rejection_reason }),
      ]
    );

    res.json({ collection: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCollections, createCollection, confirmCollection, rejectCollection };
