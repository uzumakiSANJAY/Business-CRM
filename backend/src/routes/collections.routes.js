const router = require('express').Router();
const {
  getCollections,
  createCollection,
  confirmCollection,
  rejectCollection,
} = require('../controllers/collections.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createCollectionValidator, rejectCollectionValidator } = require('../validators/collection.validator');

// All routes require authentication
router.use(auth);

// GET /api/collections — ADMIN sees all, COLLECTOR sees own
router.get('/', getCollections);

// POST /api/collections — Any authenticated user
router.post('/', createCollectionValidator, validate, createCollection);

// PUT /api/collections/:id/confirm — ADMIN only
router.put('/:id/confirm', requireRole('ADMIN'), confirmCollection);

// PUT /api/collections/:id/reject — ADMIN only
router.put('/:id/reject', requireRole('ADMIN'), rejectCollectionValidator, validate, rejectCollection);

module.exports = router;
