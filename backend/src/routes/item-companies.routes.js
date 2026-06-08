const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { getCompanies, createCompany, updateCompany, deleteCompany } = require('../controllers/item-companies.controller');

router.get('/',       auth, getCompanies);
router.post('/',      auth, requireRole('ADMIN'), createCompany);
router.put('/:id',    auth, requireRole('ADMIN'), updateCompany);
router.delete('/:id', auth, requireRole('ADMIN'), deleteCompany);

module.exports = router;
