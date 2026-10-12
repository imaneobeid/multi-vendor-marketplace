const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// 1) Must be logged in. Reads "Authorization: Bearer <token>".
exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (!token) return res.status(401).json({ message: 'Not logged in' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ message: 'User no longer exists' });

  req.user = user;
  next();
});

// 2) Must have one of these roles. Use AFTER protect.
//    Example: router.get('/x', protect, authorize('admin'), handler)
exports.authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this' });
    }
    next();
  };

// 3) Vendors can only sell once an admin approved them. Use AFTER protect.
exports.requireApprovedVendor = (req, res, next) => {
  if (req.user.role !== 'vendor' || req.user.vendorStatus !== 'approved') {
    return res.status(403).json({ message: 'Your vendor account is not approved yet' });
  }
  next();
};
