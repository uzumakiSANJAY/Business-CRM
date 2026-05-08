require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};
