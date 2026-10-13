const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createOrder, payOrder, myOrders, getOrder, vendorOrders, updateItemStatus,
} = require('../controllers/orderController');

router.post('/', protect, authorize('customer'), createOrder);
router.get('/mine', protect, authorize('customer'), myOrders);     // keep above '/:id'
router.get('/vendor', protect, authorize('vendor'), vendorOrders); // keep above '/:id'
router.get('/:id', protect, getOrder);
router.post('/:id/pay', protect, authorize('customer'), payOrder);
router.patch('/:id/items/:itemId/status', protect, authorize('vendor'), updateItemStatus);

module.exports = router;
