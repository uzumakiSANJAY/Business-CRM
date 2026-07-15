const router = require('express').Router();
const {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getItemLedger,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/inventory.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);
router.use(requireRole('ADMIN'));

router.get('/items',               getInventoryItems);
router.post('/items',              createInventoryItem);
router.put('/items/:id',           updateInventoryItem);
router.delete('/items/:id',        deleteInventoryItem);

router.get('/items/:id/ledger',    getItemLedger);
router.post('/transactions',       addTransaction);
router.put('/transactions/:id',    updateTransaction);
router.delete('/transactions/:id', deleteTransaction);

module.exports = router;
