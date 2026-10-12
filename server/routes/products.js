const router = require('express').Router();
const upload = require('../middleware/upload');
const { protect, authorize, requireApprovedVendor } = require('../middleware/auth');
const {
  listProducts, getProduct, myProducts, createProduct, updateProduct, deleteProduct,
} = require('../controllers/productController');

router.get('/', listProducts);
router.get('/mine', protect, authorize('vendor'), myProducts); // must be above '/:id'
router.get('/:id', getProduct);

router.post('/', protect, requireApprovedVendor, upload.array('images', 4), createProduct);
router.put('/:id', protect, authorize('vendor', 'admin'), upload.array('images', 4), updateProduct);
router.delete('/:id', protect, authorize('vendor', 'admin'), deleteProduct);

module.exports = router;
