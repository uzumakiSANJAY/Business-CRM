const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { getDalals, createDalal, updateDalal, deleteDalal } = require('../controllers/dalals.controller');

router.get('/',       auth, getDalals);
router.post('/',      auth, requireRole('ADMIN'), createDalal);
router.put('/:id',    auth, requireRole('ADMIN'), updateDalal);
router.delete('/:id', auth, requireRole('ADMIN'), deleteDalal);

module.exports = router;
