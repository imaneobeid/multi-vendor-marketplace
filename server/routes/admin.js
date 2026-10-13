const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { listVendors, setVendorStatus, stats } = require('../controllers/adminController');

router.use(protect, authorize('admin')); // everything below is admin-only

router.get('/vendors', listVendors);
router.patch('/vendors/:id/status', setVendorStatus);
router.get('/stats', stats);

module.exports = router;
