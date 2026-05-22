const router = require('express').Router();
const { getRoutes, createRoute, updateRoute, deleteRoute } = require('../controllers/routes.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const routeValidator = [
  body('name').trim().notEmpty().withMessage('Route name is required').isLength({ max: 100 }),
  body('description').optional({ nullable: true }).trim(),
];

router.use(auth);
router.get('/', getRoutes);
router.post('/', requireRole('ADMIN'), routeValidator, validate, createRoute);
router.put('/:id', requireRole('ADMIN'), routeValidator, validate, updateRoute);
router.delete('/:id', requireRole('ADMIN'), deleteRoute);

module.exports = router;
