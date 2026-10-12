const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { listCategories, createCategory } = require('../controllers/categoryController');

router.get('/', listCategories);
router.post('/', protect, authorize('admin'), createCategory);

module.exports = router;
