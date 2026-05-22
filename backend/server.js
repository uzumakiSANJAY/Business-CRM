const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

// Mount all routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/vendors', require('./src/routes/vendors.routes'));
app.use('/api/bills', require('./src/routes/bills.routes'));
app.use('/api/collections', require('./src/routes/collections.routes'));
app.use('/api/collectors', require('./src/routes/collectors.routes'));
app.use('/api/dashboard', require('./src/routes/dashboard.routes'));
app.use('/api/audit', require('./src/routes/audit.routes'));
app.use('/api/categories', require('./src/routes/categories.routes'));
app.use('/api/routes', require('./src/routes/routes.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use(require('./src/middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
