const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { getVehicles, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/vehicles.controller');

router.get('/',       auth, getVehicles);
router.post('/',      auth, requireRole('ADMIN'), createVehicle);
router.put('/:id',    auth, requireRole('ADMIN'), updateVehicle);
router.delete('/:id', auth, requireRole('ADMIN'), deleteVehicle);

module.exports = router;
