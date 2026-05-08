/**
 * Global Express error handler.
 * Must be registered LAST (after all routes) with 4 arguments.
 */
module.exports = (err, req, res, next) => {
  // Log full stack in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ErrorHandler]', err);
  } else {
    console.error('[ErrorHandler]', err.message);
  }

  // Postgres unique-violation error code
  if (err.code === '23505') {
    return res.status(409).json({ message: 'Duplicate entry: a record with this value already exists.' });
  }

  // Postgres foreign-key violation
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record does not exist.' });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ message });
};
