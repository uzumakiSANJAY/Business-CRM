const router = require('express').Router();
const { login, getMe } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginValidator } = require('../validators/auth.validator');

// POST /api/auth/login — Public
router.post('/login', loginValidator, validate, login);

// GET /api/auth/me — Authenticated
router.get('/me', auth, getMe);

module.exports = router;
