const router = require('express').Router();
const { getAuditLogs } = require('../controllers/audit.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// All audit routes require ADMIN role
router.use(auth, requireRole('ADMIN'));

// GET /api/audit?page=1&limit=20
router.get('/', getAuditLogs);

module.exports = router;
