const { body } = require('express-validator');

const createVendorValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Vendor name is required')
    .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),

  body('contact_person')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }).withMessage('Contact person name cannot exceed 150 characters'),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters'),

  body('address')
    .optional({ nullable: true })
    .trim(),
];

const updateVendorValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Vendor name cannot be empty')
    .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),

  body('contact_person')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }).withMessage('Contact person name cannot exceed 150 characters'),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters'),

  body('address')
    .optional({ nullable: true })
    .trim(),
];

module.exports = { createVendorValidator, updateVendorValidator };
