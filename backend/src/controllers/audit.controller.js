const pool = require('../config/db');

/**
 * GET /api/audit
 * ADMIN only. Paginated audit log with user name.
 * Query params: ?page=1&limit=20
 */
async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    // Optional filters
    const { action, entity_type, user_id } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (action) {
      conditions.push(`al.action ILIKE $${paramIndex++}`);
      params.push(`%${action}%`);
    }

    if (entity_type) {
      conditions.push(`al.entity_type = $${paramIndex++}`);
      params.push(entity_type);
    }

    if (user_id) {
      conditions.push(`al.user_id = $${paramIndex++}`);
      params.push(parseInt(user_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total for pagination
    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs al ${whereClause}`,
      params
    );

    const total = parseInt(countRes.rows[0].total, 10);

    // Fetch paginated results
    const logsRes = await pool.query(
      `SELECT
         al.id,
         al.user_id,
         al.action,
         al.entity_type,
         al.entity_id,
         al.details,
         al.created_at,
         u.name   AS user_name,
         u.email  AS user_email,
         u.role   AS user_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    res.json({
      audit_logs: logsRes.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAuditLogs };
