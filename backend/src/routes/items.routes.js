const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { getItems, createItem, updateItem, deleteItem } = require('../controllers/items.controller');

router.get('/',       auth, getItems);
router.post('/',      auth, requireRole('ADMIN'), createItem);
router.put('/:id',    auth, requireRole('ADMIN'), updateItem);
router.delete('/:id', auth, requireRole('ADMIN'), deleteItem);

module.exports = router;
