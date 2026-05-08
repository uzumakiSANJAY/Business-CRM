const pool = require('../config/db');
const { getAlertFlag, getDaysPending } = require('../services/alert.service');

/**
 * GET /api/dashboard/stats
 * ADMIN only.
 * Returns aggregated KPI stats for the current month.
 */
async function getStats(req, res, next) {
  try {
    // total_billed_month: SUM bills.amount WHERE generated_date in current month
    const billedMonthRes = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
        FROM bills
       WHERE DATE_TRUNC('month', generated_date) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // total_collected_month: SUM collections.amount WHERE status=CONFIRMED AND confirmed_at in current month
    const collectedMonthRes = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
        FROM collections
       WHERE status = 'CONFIRMED'
         AND DATE_TRUNC('month', confirmed_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
    `);

    // total_outstanding: SUM of (bill.amount - confirmed collections) for all ACTIVE bills
    const outstandingRes = await pool.query(`
      SELECT
        COALESCE(SUM(b.amount), 0) -
        COALESCE(
          (SELECT SUM(c.amount)
             FROM collections c
             JOIN bills b2 ON b2.id = c.bill_id
            WHERE b2.status = 'ACTIVE'
              AND c.status = 'CONFIRMED'),
          0
        ) AS total_outstanding
      FROM bills b
      WHERE b.status = 'ACTIVE'
    `);

    // active_alerts: count ACTIVE bills by overdue category
    const alertsRes = await pool.query(`
      SELECT generated_date
        FROM bills
       WHERE status = 'ACTIVE'
    `);

    let warn = 0;
    let crit = 0;

    for (const row of alertsRes.rows) {
      const days = Math.floor((new Date() - new Date(row.generated_date)) / (1000 * 60 * 60 * 24));
      if (days >= 7 && days <= 14) warn++;
      if (days >= 15) crit++;
    }

    res.json({
      total_billed_month: parseFloat(billedMonthRes.rows[0].total),
      total_collected_month: parseFloat(collectedMonthRes.rows[0].total),
      total_outstanding: Math.max(0, parseFloat(outstandingRes.rows[0].total_outstanding)),
      active_alerts: { warn, crit },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/monthly-chart
 * ADMIN only.
 * Returns last 6 months of billed vs collected amounts.
 */
async function getMonthlyChart(req, res, next) {
  try {
    const billedRes = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', generated_date), 'Mon YYYY') AS month,
        DATE_TRUNC('month', generated_date)                        AS month_date,
        COALESCE(SUM(amount), 0)                                   AS billed
      FROM bills
      WHERE generated_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY DATE_TRUNC('month', generated_date)
      ORDER BY DATE_TRUNC('month', generated_date) ASC
    `);

    const collectedRes = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', confirmed_at), 'Mon YYYY') AS month,
        DATE_TRUNC('month', confirmed_at)                       AS month_date,
        COALESCE(SUM(amount), 0)                                AS collected
      FROM collections
      WHERE status = 'CONFIRMED'
        AND confirmed_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY DATE_TRUNC('month', confirmed_at)
      ORDER BY DATE_TRUNC('month', confirmed_at) ASC
    `);

    // Build a map of month_date -> collected
    const collectedMap = {};
    for (const row of collectedRes.rows) {
      collectedMap[row.month_date.toISOString()] = parseFloat(row.collected);
    }

    // Generate last 6 months array ensuring all months are represented
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      d.setHours(0, 0, 0, 0);

      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const isoKey = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString();

      const billedRow = billedRes.rows.find((r) => {
        const rd = new Date(r.month_date);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      });

      months.push({
        month: monthLabel,
        billed: billedRow ? parseFloat(billedRow.billed) : 0,
        collected: collectedMap[isoKey] || 0,
      });
    }

    res.json({ chart: months });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/daily
 * ADMIN only.
 * Returns last 30 days of confirmed collections.
 */
async function getDaily(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(collection_date, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(amount), 0)               AS collected
      FROM collections
      WHERE status = 'CONFIRMED'
        AND collection_date >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY collection_date
      ORDER BY collection_date ASC
    `);

    // Ensure all 30 days are present (fill zeros for missing days)
    const dailyMap = {};
    for (const row of result.rows) {
      dailyMap[row.date] = parseFloat(row.collected);
    }

    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, collected: dailyMap[dateStr] || 0 });
    }

    res.json({ daily: days });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/vendor-table
 * ADMIN only.
 * Returns all active vendors with outstanding balance, alert_flag, days_pending.
 */
async function getVendorTable(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        v.id,
        v.name,
        b.id            AS bill_id,
        b.amount,
        b.generated_date,
        b.status        AS bill_status,
        COALESCE(
          (SELECT SUM(c.amount)
             FROM collections c
            WHERE c.bill_id = b.id AND c.status = 'CONFIRMED'),
          0
        )               AS confirmed_collected
      FROM vendors v
      LEFT JOIN bills b ON b.vendor_id = v.id AND b.status = 'ACTIVE'
      WHERE v.is_active = true
      ORDER BY v.name ASC
    `);

    const vendors = result.rows.map((row) => {
      const outstanding = row.bill_id
        ? Math.max(0, parseFloat(row.amount) - parseFloat(row.confirmed_collected))
        : 0;

      const alertFlag = row.bill_id
        ? getAlertFlag(row.generated_date, row.bill_status)
        : 'DONE';

      const daysPending = row.bill_id ? getDaysPending(row.generated_date) : 0;

      return {
        id: row.id,
        name: row.name,
        outstanding,
        alert_flag: alertFlag,
        days_pending: daysPending,
      };
    });

    res.json({ vendors });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats, getMonthlyChart, getDaily, getVendorTable };
