const router = require('express').Router();
const {
  getBills,
  getBillById,
  createBill,
  cancelBill,
} = require('../controllers/bills.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createBillValidator } = require('../validators/bill.validator');

// All bill routes require ADMIN role
router.use(auth, requireRole('ADMIN'));

// GET /api/bills
router.get('/', getBills);

// GET /api/bills/:id
router.get('/:id', getBillById);

// POST /api/bills
router.post('/', createBillValidator, validate, createBill);

// PUT /api/bills/:id/cancel
router.put('/:id/cancel', cancelBill);

module.exports = router;
