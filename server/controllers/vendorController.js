const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { TZ, round2, fillDays } = require('../utils/stats');

const LOW_STOCK = 5;
const DAYS = 7;

// GET /api/vendor/stats   (vendor)
exports.stats = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const since = new Date(Date.now() - (DAYS + 1) * 86400000);

  // Paid orders -> one row per item -> only this vendor's items (cancelled ones don't count)
  const myItems = [
    { $match: { paymentStatus: 'paid' } },
    { $unwind: '$items' },
    { $match: { 'items.vendor': vendorId, 'items.status': { $ne: 'cancelled' } } },
  ];
  const lineTotal = { $multiply: ['$items.price', '$items.quantity'] };

  const [sales, dailyRows, products] = await Promise.all([
    Order.aggregate([
      ...myItems,
      {
        $group: {
          _id: '$items.product',
          units: { $sum: '$items.quantity' },
          revenue: { $sum: lineTotal },
          orders: { $addToSet: '$_id' },
        },
      },
    ]),
    Order.aggregate([
      ...myItems,
      { $match: { paidAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: TZ } },
          revenue: { $sum: lineTotal },
        },
      },
    ]),
    Product.find({ vendor: vendorId }).select('name price stock images').lean(),
  ]);

  const salesById = new Map(sales.map((s) => [String(s._id), s]));
  const orderIds = new Set(sales.flatMap((s) => s.orders.map(String)));

  const rows = products
    .map((p) => {
      const s = salesById.get(String(p._id));
      return {
        _id: p._id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        image: p.images && p.images[0],
        units: s ? s.units : 0,
        revenue: round2(s ? s.revenue : 0),
      };
    })
    .sort((a, b) => a.stock - b.stock); // lowest stock first

  res.json({
    lowStockThreshold: LOW_STOCK,
    totals: {
      revenue: round2(sales.reduce((sum, s) => sum + s.revenue, 0)),
      unitsSold: sales.reduce((sum, s) => sum + s.units, 0),
      orders: orderIds.size,
      products: products.length,
    },
    products: rows,
    daily: fillDays(dailyRows, DAYS),
  });
});
