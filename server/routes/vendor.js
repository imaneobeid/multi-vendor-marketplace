const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { stats } = require('../controllers/vendorController');

router.get('/stats', protect, authorize('vendor'), stats);

module.exports = router;
