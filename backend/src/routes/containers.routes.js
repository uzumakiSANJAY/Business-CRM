const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  getContainerTypes, createContainerType, updateContainerType, deleteContainerType,
  containerise, sellContainers, getContainerLedger,
} = require('../controllers/containers.controller');

router.use(auth, requireRole('ADMIN'));

router.get('/types',              getContainerTypes);
router.post('/types',             createContainerType);
router.put('/types/:id',          updateContainerType);
router.delete('/types/:id',       deleteContainerType);
router.get('/types/:id/ledger',   getContainerLedger);
router.post('/containerise',      containerise);
router.post('/sell',              sellContainers);

module.exports = router;
