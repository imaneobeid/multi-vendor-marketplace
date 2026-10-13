const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { deleteReview } = require('../controllers/reviewController');

router.delete('/:id', protect, authorize('customer', 'admin'), deleteReview);

module.exports = router;
