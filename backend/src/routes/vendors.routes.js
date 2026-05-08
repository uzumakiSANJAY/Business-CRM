const router = require('express').Router();
const {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} = require('../controllers/vendors.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createVendorValidator, updateVendorValidator } = require('../validators/vendor.validator');

// All routes require authentication
router.use(auth);

// GET /api/vendors — Both roles
router.get('/', getVendors);

// GET /api/vendors/:id — Both roles
router.get('/:id', getVendorById);

// POST /api/vendors — ADMIN only
router.post('/', requireRole('ADMIN'), createVendorValidator, validate, createVendor);

// PUT /api/vendors/:id — ADMIN only
router.put('/:id', requireRole('ADMIN'), updateVendorValidator, validate, updateVendor);

// DELETE /api/vendors/:id — ADMIN only
router.delete('/:id', requireRole('ADMIN'), deleteVendor);

module.exports = router;
