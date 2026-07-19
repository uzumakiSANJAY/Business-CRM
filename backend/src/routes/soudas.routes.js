const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  getSoudas, createSouda, updateSouda, deleteSouda,
  addDelivery, deleteDelivery,
} = require('../controllers/soudas.controller');

router.get('/',                          auth, getSoudas);
router.post('/',                         auth, createSouda);                    // ADMIN + COLLECTOR
router.put('/:id',                       auth, requireRole('ADMIN'), updateSouda);
router.delete('/:id',                    auth, requireRole('ADMIN'), deleteSouda);
router.post('/:id/deliveries',           auth, requireRole('ADMIN'), addDelivery);
router.delete('/:id/deliveries/:deliveryId', auth, requireRole('ADMIN'), deleteDelivery);

module.exports = router;
