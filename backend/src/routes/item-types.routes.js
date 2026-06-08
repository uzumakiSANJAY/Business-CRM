const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { getTypes, createType, updateType, deleteType } = require('../controllers/item-types.controller');

router.get('/',       auth, getTypes);
router.post('/',      auth, requireRole('ADMIN'), createType);
router.put('/:id',    auth, requireRole('ADMIN'), updateType);
router.delete('/:id', auth, requireRole('ADMIN'), deleteType);

module.exports = router;
