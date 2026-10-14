const User = require('../models/User');

// ids of vendors an admin has approved. Only their products are visible and buyable.
exports.approvedVendorIds = () => User.distinct('_id', { role: 'vendor', vendorStatus: 'approved' });

exports.isApprovedVendor = async (id) =>
  !!id && !!(await User.exists({ _id: id, role: 'vendor', vendorStatus: 'approved' }));
