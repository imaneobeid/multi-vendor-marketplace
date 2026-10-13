const router = require('express').Router();
const upload = require('../middleware/upload');
const { protect, authorize, requireApprovedVendor } = require('../middleware/auth');
const {
  listProducts, getProduct, myProducts, createProduct, updateProduct, deleteProduct,
} = require('../controllers/productController');
const { listReviews, upsertReview } = require('../controllers/reviewController');

router.get('/', listProducts);
router.get('/mine', protect, authorize('vendor'), myProducts); // must be above '/:id'
router.get('/:id', getProduct);

// Reviews (Day 5)
router.get('/:id/reviews', listReviews);
router.post('/:id/reviews', protect, authorize('customer'), upsertReview);

router.post('/', protect, requireApprovedVendor, upload.array('images', 4), createProduct);
router.put('/:id', protect, authorize('vendor', 'admin'), upload.array('images', 4), updateProduct);
router.delete('/:id', protect, authorize('vendor', 'admin'), deleteProduct);

module.exports = router;
