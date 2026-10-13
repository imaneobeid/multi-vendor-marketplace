const { isValidObjectId } = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { TZ, round2, fillDays } = require('../utils/stats');

const DAYS = 7;
const STATUSES = ['pending', 'approved', 'rejected'];

// GET /api/admin/vendors?status=pending|approved|rejected|all
exports.listVendors = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { role: 'vendor' };
  if (status && status !== 'all') {
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Unknown status' });
    filter.vendorStatus = status;
  }
  res.json(
    await User.find(filter).select('name email storeName storeDescription vendorStatus createdAt').sort('-createdAt')
  );
});

// PATCH /api/admin/vendors/:id/status   Body: { status: 'approved' | 'rejected' | 'pending' }
exports.setVendorStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Status must be approved, rejected or pending' });
  }
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Vendor not found' });

  const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });
  if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

  vendor.vendorStatus = status;
  await vendor.save();
  res.json({
    _id: vendor._id,
    name: vendor.name,
    email: vendor.email,
    storeName: vendor.storeName,
    storeDescription: vendor.storeDescription,
    vendorStatus: vendor.vendorStatus,
    createdAt: vendor.createdAt,
  });
});

// GET /api/admin/stats   (platform report)
exports.stats = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - (DAYS + 1) * 86400000);
  const paidItems = [
    { $match: { paymentStatus: 'paid' } },
    { $unwind: '$items' },
    { $match: { 'items.status': { $ne: 'cancelled' } } },
  ];
  const lineTotal = { $multiply: ['$items.price', '$items.quantity'] };

  const [roleRows, vendorRows, productCount, orderTotals, topVendors, topProducts, dailyRows] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: 'vendor' } }, { $group: { _id: '$vendorStatus', n: { $sum: 1 } } }]),
    Product.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } },
    ]),
    Order.aggregate([
      ...paidItems,
      { $group: { _id: '$items.vendor', revenue: { $sum: lineTotal }, units: { $sum: '$items.quantity' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'v' } },
      { $project: { revenue: 1, units: 1, storeName: { $arrayElemAt: ['$v.storeName', 0] } } },
    ]),
    Order.aggregate([
      ...paidItems,
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, revenue: { $sum: lineTotal }, units: { $sum: '$items.quantity' } } },
      { $sort: { units: -1, revenue: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', paidAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: TZ } },
          revenue: { $sum: '$totalPrice' },
        },
      },
    ]),
  ]);

  const roles = Object.fromEntries(roleRows.map((r) => [r._id, r.n]));
  const vendors = Object.fromEntries(vendorRows.map((r) => [r._id, r.n]));
  const totals = orderTotals[0] || { count: 0, revenue: 0 };

  res.json({
    users: { customers: roles.customer || 0, vendors: roles.vendor || 0, admins: roles.admin || 0 },
    vendors: { pending: vendors.pending || 0, approved: vendors.approved || 0, rejected: vendors.rejected || 0 },
    products: productCount,
    orders: { paid: totals.count, revenue: round2(totals.revenue) },
    topVendors: topVendors.map((v) => ({ ...v, revenue: round2(v.revenue) })),
    topProducts: topProducts.map((p) => ({ ...p, revenue: round2(p.revenue) })),
    daily: fillDays(dailyRows, DAYS),
  });
});
