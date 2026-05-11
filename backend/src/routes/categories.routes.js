const router = require('express').Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categories.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const categoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 100 }),
  body('description').optional({ nullable: true }).trim(),
];

router.use(auth);
router.get('/', getCategories);
router.post('/', requireRole('ADMIN'), categoryValidator, validate, createCategory);
router.put('/:id', requireRole('ADMIN'), categoryValidator, validate, updateCategory);
router.delete('/:id', requireRole('ADMIN'), deleteCategory);

module.exports = router;
