const { body } = require('express-validator');

const createCollectionValidator = [
  body('bill_id')
    .notEmpty().withMessage('bill_id is required')
    .isInt({ min: 1 }).withMessage('bill_id must be a positive integer'),

  body('vendor_id')
    .notEmpty().withMessage('vendor_id is required')
    .isInt({ min: 1 }).withMessage('vendor_id must be a positive integer'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),

  body('collection_date')
    .notEmpty().withMessage('collection_date is required')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('collection_date must be a valid date (YYYY-MM-DD)'),

  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),

  body('payment_mode')
    .optional({ nullable: true })
    .isIn(['CASH', 'UPI', 'CREDIT_CARD', 'CHEQUE', 'BANK_TRANSFER'])
    .withMessage('payment_mode must be CASH, UPI, CREDIT_CARD, CHEQUE, or BANK_TRANSFER'),
];

const rejectCollectionValidator = [
  body('rejection_reason')
    .trim()
    .notEmpty().withMessage('Rejection reason is required')
    .isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters'),
];

module.exports = { createCollectionValidator, rejectCollectionValidator };
