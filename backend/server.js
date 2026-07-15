const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// Auto-run migrations on startup in production (idempotent — safe to repeat)
if (process.env.NODE_ENV === 'production') {
  try {
    console.log('Running database migrations...');
    execSync(`node "${path.join(__dirname, 'scripts/migrate.js')}"`, { stdio: 'inherit' });
    console.log('Migrations complete.');
  } catch (e) {
    console.error('Migration error (continuing):', e.message);
  }
}

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
  credentials: true,
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check for Railway uptime monitoring
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

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
app.use('/api/items', require('./src/routes/items.routes'));
app.use('/api/item-companies', require('./src/routes/item-companies.routes'));
app.use('/api/item-types', require('./src/routes/item-types.routes'));
app.use('/api/dalals', require('./src/routes/dalals.routes'));
app.use('/api/vehicles', require('./src/routes/vehicles.routes'));
app.use('/api/soudas',     require('./src/routes/soudas.routes'));
app.use('/api/inventory', require('./src/routes/inventory.routes'));

// Global error handler (must be before catch-all)
app.use(require('./src/middleware/errorHandler'));

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
