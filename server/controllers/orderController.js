const { isValidObjectId } = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const gateway = require('../services/paymentGateway');
const asyncHandler = require('../utils/asyncHandler');

const round2 = (n) => Math.round(n * 100) / 100;

const ADDRESS_FIELDS = [
  ['fullName', 'full name'],
  ['address', 'address'],
  ['city', 'city'],
  ['postalCode', 'postal code'],
  ['country', 'country'],
];

// Put stock back (used when a payment fails part-way)
async function releaseStock(items) {
  await Promise.all(
    items.map((it) => Product.updateOne({ _id: it.product }, { $inc: { stock: it.quantity } }))
  );
}

// POST /api/orders   (customer)
// Body: { items: [{ productId, quantity }], shippingAddress: {...} }
// Prices and stock are ALWAYS read from the database, never trusted from the browser.
exports.createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Your cart is empty' });
  }
  if (items.length > 50) return res.status(400).json({ message: 'Too many items in one order' });

  const address = {};
  for (const [field, label] of ADDRESS_FIELDS) {
    const value = String((shippingAddress && shippingAddress[field]) || '').trim();
    if (!value) return res.status(400).json({ message: `Please enter your ${label}` });
    address[field] = value;
  }

  // Merge duplicate products and validate quantities
  const wanted = new Map();
  for (const it of items) {
    const id = String(it.productId);
    const qty = Number(it.quantity);
    if (!isValidObjectId(id) || !Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: 'Invalid item in your cart' });
    }
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }

  const products = await Product.find({ _id: { $in: [...wanted.keys()] } });
  if (products.length !== wanted.size) {
    return res.status(400).json({
      message: 'Some products in your cart are no longer available. Remove them and try again.',
    });
  }

  const orderItems = [];
  for (const p of products) {
    const qty = wanted.get(String(p._id));
    if (p.stock < qty) {
      return res.status(409).json({
        message: p.stock === 0 ? `"${p.name}" is sold out` : `Only ${p.stock} of "${p.name}" left in stock`,
      });
    }
    orderItems.push({
      product: p._id,
      vendor: p.vendor,
      name: p.name,
      image: p.images && p.images[0],
      price: p.price,
      quantity: qty,
    });
  }

  const totalPrice = round2(orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const order = await Order.create({
    customer: req.user._id,
    items: orderItems,
    shippingAddress: address,
    totalPrice,
  });
  res.status(201).json(order);
});

// POST /api/orders/:id/pay   (the customer who owns the order)
// Body: { card: { number, expMonth, expYear, cvc } }
exports.payOrder = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Order not found' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!order.customer.equals(req.user._id)) return res.status(403).json({ message: 'This is not your order' });
  if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'This order is already paid' });

  const card = req.body.card || {};
  const check = gateway.validateCard(card);
  if (check.error) return res.status(400).json({ message: check.error });

  // 1) Reserve the stock. Each update only succeeds if enough stock is left,
  //    so two customers can never buy the last item at the same time.
  const reserved = [];
  for (const it of order.items) {
    const r = await Product.updateOne(
      { _id: it.product, stock: { $gte: it.quantity } },
      { $inc: { stock: -it.quantity } }
    );
    if (r.modifiedCount === 1) {
      reserved.push(it);
    } else {
      await releaseStock(reserved);
      return res.status(409).json({
        message: `"${it.name}" no longer has enough stock. Go back to your cart and adjust it.`,
      });
    }
  }

  // 2) Charge the card
  const result = await gateway.charge({ amount: order.totalPrice, card });
  if (!result.success) {
    await releaseStock(reserved); // payment failed: give the stock back
    return res.status(402).json({ message: result.message, code: result.code });
  }

  // 3) Mark the order as paid
  order.paymentStatus = 'paid';
  order.transactionId = result.transactionId;
  order.cardLast4 = result.last4;
  order.paidAt = new Date();
  await order.save();

  res.json(order);
});

// GET /api/orders/mine   (customer)
exports.myOrders = asyncHandler(async (req, res) => {
  res.json(await Order.find({ customer: req.user._id }).sort('-createdAt'));
});

// GET /api/orders/:id   (owner, admin, or a vendor who sold something in it)
exports.getOrder = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Order not found' });
  const order = await Order.findById(req.params.id).populate('customer', 'name email');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (req.user.role === 'admin' || order.customer._id.equals(req.user._id)) return res.json(order);

  if (req.user.role === 'vendor') {
    const mine = order.items.filter((i) => i.vendor.equals(req.user._id));
    if (mine.length) return res.json({ ...order.toObject(), items: mine });
  }
  res.status(403).json({ message: 'You cannot view this order' });
});

// GET /api/orders/vendor   (vendor): paid orders containing this vendor's items
exports.vendorOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ paymentStatus: 'paid', 'items.vendor': req.user._id })
    .populate('customer', 'name email')
    .sort('-createdAt');

  res.json(
    orders.map((o) => {
      const obj = o.toObject();
      obj.items = obj.items.filter((i) => i.vendor.equals(req.user._id));
      return obj;
    })
  );
});

// PATCH /api/orders/:id/items/:itemId/status   (the vendor who owns the item)
// Body: { status: 'shipped' | 'delivered' }. Only moves forward: placed -> shipped -> delivered.
exports.updateItemStatus = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  if (!isValidObjectId(id) || !isValidObjectId(itemId)) {
    return res.status(404).json({ message: 'Order item not found' });
  }
  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.paymentStatus !== 'paid') return res.status(400).json({ message: 'This order is not paid yet' });

  const item = order.items.id(itemId);
  if (!item) return res.status(404).json({ message: 'Order item not found' });
  if (!item.vendor.equals(req.user._id)) return res.status(403).json({ message: 'This is not your item' });

  const next = { placed: 'shipped', shipped: 'delivered' }[item.status];
  if (!next || req.body.status !== next) {
    return res.status(400).json({
      message: next ? `This item is ${item.status}. The next step is "${next}".` : `This item is already ${item.status}.`,
    });
  }

  item.status = next;
  await order.save();
  res.json(item);
});
