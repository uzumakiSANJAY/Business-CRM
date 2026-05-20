const pool = require('../config/db');
const { getAlertFlag, getDaysPending } = require('../services/alert.service');

/**
 * GET /api/bills
 * ADMIN only. All bills with vendor name, alert_flag, outstanding balance.
 */
async function getBills(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.vendor_id,
        v.name              AS vendor_name,
        b.amount,
        b.generated_date,
        b.status,
        b.created_at,
        u.name              AS generated_by_name,
        COALESCE(
          (SELECT SUM(c.amount)
             FROM collections c
            WHERE c.bill_id = b.id AND c.status = 'CONFIRMED'),
          0
        )                   AS confirmed_collected
      FROM bills b
      JOIN vendors v ON v.id = b.vendor_id
      LEFT JOIN users u ON u.id = b.generated_by
      ORDER BY b.created_at DESC
    `);

    const bills = result.rows.map((row) => {
      const outstanding = Math.max(0, parseFloat(row.amount) - parseFloat(row.confirmed_collected));
      return {
        id: row.id,
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,
        amount: parseFloat(row.amount),
        generated_date: row.generated_date,
        status: row.status,
        created_at: row.created_at,
        generated_by_name: row.generated_by_name,
        outstanding,
        alert_flag: getAlertFlag(row.generated_date, row.status),
        days_pending: getDaysPending(row.generated_date),
      };
    });

    res.json({ bills });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bills/:id
 * ADMIN only. Bill detail with confirmed collections.
 */
async function getBillById(req, res, next) {
  try {
    const { id } = req.params;

    const billRes = await pool.query(`
      SELECT
        b.*,
        v.name              AS vendor_name,
        u.name              AS generated_by_name
      FROM bills b
      JOIN vendors v ON v.id = b.vendor_id
      LEFT JOIN users u ON u.id = b.generated_by
      WHERE b.id = $1
    `, [id]);

    if (!billRes.rows.length) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = billRes.rows[0];

    // Fetch confirmed collections for this bill
    const collRes = await pool.query(`
      SELECT
        c.*,
        u.name AS collector_name,
        adm.name AS confirmed_by_name
      FROM collections c
      JOIN users u ON u.id = c.collector_id
      LEFT JOIN users adm ON adm.id = c.confirmed_by
      WHERE c.bill_id = $1
      ORDER BY c.submitted_at DESC
    `, [id]);

    const confirmedTotal = collRes.rows
      .filter((c) => c.status === 'CONFIRMED')
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);

    const outstanding = Math.max(0, parseFloat(bill.amount) - confirmedTotal);

    res.json({
      bill: {
        ...bill,
        amount: parseFloat(bill.amount),
        outstanding,
        alert_flag: getAlertFlag(bill.generated_date, bill.status),
        days_pending: getDaysPending(bill.generated_date),
        collections: collRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bills
 * ADMIN only. Generate a new bill.
 * RULE 1: Vendor can have only ONE ACTIVE bill at a time.
 */
async function createBill(req, res, next) {
  try {
    const { vendor_id, amount, generated_date } = req.body;

    // Verify vendor exists and is active
    const vendorCheck = await pool.query(
      'SELECT id, name FROM vendors WHERE id = $1 AND is_active = true',
      [vendor_id]
    );
    if (!vendorCheck.rows.length) {
      return res.status(404).json({ message: 'Vendor not found or inactive' });
    }

    const result = await pool.query(
      `INSERT INTO bills (vendor_id, amount, generated_date, generated_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [vendor_id, amount, generated_date, req.user.id]
    );

    const bill = result.rows[0];

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'CREATE_BILL',
        'bills',
        bill.id,
        JSON.stringify({ vendor_id, amount, generated_date, vendor_name: vendorCheck.rows[0].name }),
      ]
    );

    res.status(201).json({ bill: { ...bill, amount: parseFloat(bill.amount) } });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/bills/:id/cancel
 * ADMIN only. Cancel a bill.
 */
async function cancelBill(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id, vendor_id, status FROM bills WHERE id = $1',
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = existing.rows[0];

    if (bill.status === 'PAID') {
      return res.status(400).json({ message: 'Cannot cancel a paid bill' });
    }

    if (bill.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Bill is already cancelled' });
    }

    const result = await pool.query(
      "UPDATE bills SET status = 'CANCELLED' WHERE id = $1 RETURNING *",
      [id]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'CANCEL_BILL', 'bills', parseInt(id), JSON.stringify({ vendor_id: bill.vendor_id })]
    );

    res.json({ bill: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBills, getBillById, createBill, cancelBill };
