const router = require('express').Router();
const {
  getStats,
  getMonthlyChart,
  getDaily,
  getVendorTable,
} = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// All dashboard routes require ADMIN role
router.use(auth, requireRole('ADMIN'));

// GET /api/dashboard/stats
router.get('/stats', getStats);

// GET /api/dashboard/monthly-chart
router.get('/monthly-chart', getMonthlyChart);

// GET /api/dashboard/daily
router.get('/daily', getDaily);

// GET /api/dashboard/vendor-table
router.get('/vendor-table', getVendorTable);

module.exports = router;
