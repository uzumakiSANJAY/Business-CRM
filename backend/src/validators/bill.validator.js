const { body } = require('express-validator');

const createBillValidator = [
  body('vendor_id')
    .notEmpty().withMessage('vendor_id is required')
    .isInt({ min: 1 }).withMessage('vendor_id must be a positive integer'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),

  body('generated_date')
    .notEmpty().withMessage('generated_date is required')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('generated_date must be a valid date (YYYY-MM-DD)'),
];

const cancelBillValidator = [
  // No body params required, but we validate the path param is an int
  // (handled by the controller checking parseInt)
];

module.exports = { createBillValidator, cancelBillValidator };
