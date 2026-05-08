const { validationResult } = require('express-validator');

/**
 * Middleware that reads express-validator results and returns 422 if any errors exist.
 * Place this AFTER your validator chains in the route definition.
 */
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};
