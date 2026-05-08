const router = require('express').Router();
const {
  getCollectors,
  createCollector,
  updateCollector,
  deleteCollector,
} = require('../controllers/collectors.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// All collector management routes require ADMIN role
router.use(auth, requireRole('ADMIN'));

// GET /api/collectors
router.get('/', getCollectors);

// POST /api/collectors
router.post('/', createCollector);

// PUT /api/collectors/:id
router.put('/:id', updateCollector);

// DELETE /api/collectors/:id
router.delete('/:id', deleteCollector);

module.exports = router;
