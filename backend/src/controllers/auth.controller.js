const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * POST /api/auth/login
 * Public. Authenticates a user and returns a JWT.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Fetch user by email (case-insensitive)
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated. Contact administrator.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    // Audit log: login
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'LOGIN', 'users', user.id, JSON.stringify({ email: user.email, role: user.role })]
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Authenticated. Returns the current user's profile.
 */
async function getMe(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, getMe };
