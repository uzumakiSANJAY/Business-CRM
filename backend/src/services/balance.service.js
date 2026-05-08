const pool = require('../config/db');

/**
 * Recalculates the outstanding balance for a bill.
 * If outstanding <= 0, automatically marks the bill as PAID.
 *
 * @param {number} billId
 * @returns {Promise<number>} The outstanding balance (minimum 0)
 */
async function recalcAndMarkPaid(billId) {
  const billRes = await pool.query('SELECT amount FROM bills WHERE id = $1', [billId]);
  if (!billRes.rows.length) {
    throw new Error(`Bill ${billId} not found`);
  }
  const bill = billRes.rows[0];

  const collRes = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM collections
      WHERE bill_id = $1
        AND status = 'CONFIRMED'`,
    [billId]
  );

  const confirmed = parseFloat(collRes.rows[0].total);
  const outstanding = parseFloat(bill.amount) - confirmed;

  if (outstanding <= 0) {
    await pool.query("UPDATE bills SET status = 'PAID' WHERE id = $1", [billId]);
  }

  return Math.max(0, outstanding);
}

/**
 * Calculates the current outstanding balance for a bill without mutating state.
 *
 * @param {number} billId
 * @returns {Promise<number>}
 */
async function getOutstanding(billId) {
  const billRes = await pool.query('SELECT amount, status FROM bills WHERE id = $1', [billId]);
  if (!billRes.rows.length) return 0;

  const bill = billRes.rows[0];
  if (bill.status === 'PAID' || bill.status === 'CANCELLED') return 0;

  const collRes = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM collections
      WHERE bill_id = $1
        AND status = 'CONFIRMED'`,
    [billId]
  );

  const confirmed = parseFloat(collRes.rows[0].total);
  return Math.max(0, parseFloat(bill.amount) - confirmed);
}

module.exports = { recalcAndMarkPaid, getOutstanding };
