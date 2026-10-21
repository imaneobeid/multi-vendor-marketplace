const { isValidObjectId } = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const gateway = require('../services/paymentGateway');
const asyncHandler = require('../utils/asyncHandler');
const { approvedVendorIds } = require('../utils/vendors');

const round2 = (n) => Math.round(n * 100) / 100;

const UNPAID = ['pending', 'failed'];          // orders that can still be paid or cancelled
const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000; // an unpaid order is cancelled after 24 hours
const LOCK_MS = 2 * 60 * 1000;                 // a "processing" lock older than this is considered stuck

const ADDRESS_FIELDS = [
  ['fullName', 'full name'],
  ['address', 'address'],
  ['city', 'city'],
  ['postalCode', 'postal code'],
  ['country', 'country'],
];

// ---------- helpers ----------

// Put stock back (used when a payment fails part-way or an order is refunded)
async function releaseStock(items) {
  await Promise.all(
    items.map((it) => Product.updateOne({ _id: it.product }, { $inc: { stock: it.quantity } }))
  );
}

// Cancel an order that was never paid. Safe to call twice: only one caller can win.
async function cancelUnpaid(orderId, reason) {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $in: UNPAID } },
    { $set: { paymentStatus: 'cancelled', cancelledAt: new Date(), cancelReason: reason } },
    { new: true }
  );
  if (!claimed) return null;
  claimed.items.forEach((i) => {
    i.status = 'cancelled';
  });
  await claimed.save();
  return claimed;
}

// Unpaid orders older than 24 hours are cancelled, so statuses never stay "pending" forever
async function expireStale(filter) {
  const stale = await Order.find({
    ...filter,
    paymentStatus: { $in: UNPAID },
    createdAt: { $lt: new Date(Date.now() - PAYMENT_WINDOW_MS) },
  }).select('_id');
  for (const o of stale) await cancelUnpaid(o._id, 'Payment was not completed within 24 hours');
}

// What a vendor may see of an order: no payment details, no customer email
function vendorView(order, vendorId) {
  const obj = order.toObject ? order.toObject() : order;
  obj.items = obj.items.filter((i) => i.vendor.equals(vendorId));
  delete obj.transactionId;
  delete obj.cardLast4;
  delete obj.paymentAttempts;
  delete obj.refundId;
  if (obj.customer && obj.customer.email) delete obj.customer.email;
  return obj;
}

// ---------- create ----------

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
    address[field] = value.slice(0, 200);
  }

  // Merge duplicate products and validate quantities
  const wanted = new Map();
  for (const it of items) {
    const id = String(it.productId);
    const qty = Number(it.quantity);
    if (!isValidObjectId(id) || !Number.isInteger(qty) || qty < 1 || qty > 100) {
      return res.status(400).json({ message: 'Invalid item in your cart' });
    }
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }

  const products = await Product.find({ _id: { $in: [...wanted.keys()] } });
  const approved = new Set((await approvedVendorIds()).map(String));
  if (products.length !== wanted.size || products.some((p) => !approved.has(String(p.vendor)))) {
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

  // A new order replaces any unpaid ones from before, so "My orders" never fills up with abandoned carts
  const abandoned = await Order.find({ customer: req.user._id, paymentStatus: { $in: UNPAID } }).select('_id');
  for (const o of abandoned) await cancelUnpaid(o._id, 'Replaced by a newer order');

  const totalPrice = round2(orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const order = await Order.create({
    customer: req.user._id,
    items: orderItems,
    shippingAddress: address,
    totalPrice,
  });
  res.status(201).json(order);
});

// ---------- pay ----------

// POST /api/orders/:id/pay   (the customer who owns the order)
// Body: { card: { number, expMonth, expYear, cvc } }
//
// What can happen:
//   success          -> 200, order is "paid", stock is reduced
//   declined         -> 402, order is "failed" (the customer can try another card), stock untouched
//   bad card details -> 400, nothing changes
//   out of stock     -> 409, nothing is charged
//   already paying   -> 409 (a second click or a second tab can never charge twice)
exports.payOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(404).json({ message: 'Order not found' });

  await expireStale({ _id: id });

  // Card details are checked first: typos never touch the order or the stock
  const check = gateway.validateCard(req.body.card || {});
  if (check.error) return res.status(400).json({ message: check.error, code: 'invalid_card' });

  // Take a lock: only one payment per order can run at a time
  const order = await Order.findOneAndUpdate(
    {
      _id: id,
      customer: req.user._id,
      $or: [
        { paymentStatus: { $in: UNPAID } },
        { paymentStatus: 'processing', processingAt: { $lt: new Date(Date.now() - LOCK_MS) } },
      ],
    },
    { $set: { paymentStatus: 'processing', processingAt: new Date() } },
    { new: false } // we get the order as it was before the lock
  );

  if (!order) {
    const existing = await Order.findById(id);
    if (!existing || !existing.customer.equals(req.user._id)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const messages = {
      paid: 'This order is already paid',
      cancelled: 'This order was cancelled',
      refunded: 'This order was cancelled and refunded',
      processing: 'A payment for this order is already in progress. Please wait a moment.',
    };
    return res
      .status(existing.paymentStatus === 'processing' ? 409 : 400)
      .json({ message: messages[existing.paymentStatus] || 'This order cannot be paid', paymentStatus: existing.paymentStatus });
  }

  const before = order.paymentStatus === 'processing' ? 'failed' : order.paymentStatus;
  const unlock = (status) =>
    Order.updateOne({ _id: id }, { $set: { paymentStatus: status }, $unset: { processingAt: 1 } });

  // Items from a vendor who is no longer approved cannot be bought
  const approvedNow = new Set((await approvedVendorIds()).map(String));
  if (order.items.some((it) => !approvedNow.has(String(it.vendor)))) {
    await unlock(before);
    return res.status(409).json({ message: 'Some items in this order are no longer available.' });
  }

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
      await unlock(before);
      return res.status(409).json({
        message: `"${it.name}" no longer has enough stock. Go back to your cart and adjust it.`,
      });
    }
  }

  // 2) Charge the card
  let result;
  try {
    result = await gateway.charge({ amount: order.totalPrice, card: req.body.card });
  } catch (err) {
    result = { success: false, code: 'processing_error', message: 'The payment could not be processed. Please try again.' };
  }

  const attempt = {
    at: new Date(),
    success: !!result.success,
    code: result.success ? 'succeeded' : result.code,
    message: result.success ? 'Payment succeeded' : result.message,
    last4: result.last4 || check.number.slice(-4),
    brand: result.brand || check.brand,
  };

  // 3a) Declined: give the stock back, mark the order "failed", keep a record of the attempt
  if (!result.success) {
    await releaseStock(reserved);
    await Order.updateOne(
      { _id: id },
      { $set: { paymentStatus: 'failed' }, $unset: { processingAt: 1 }, $push: { paymentAttempts: attempt } }
    );
    return res.status(402).json({ message: result.message, code: result.code, paymentStatus: 'failed' });
  }

  // 3b) Success: mark the order as paid
  await Order.updateOne(
    { _id: id },
    {
      $set: { paymentStatus: 'paid', transactionId: result.transactionId, cardLast4: result.last4, paidAt: new Date() },
      $unset: { processingAt: 1 },
      $push: { paymentAttempts: attempt },
    }
  );
  res.json(await Order.findById(id));
});

// ---------- cancel ----------

// POST /api/orders/:id/cancel   (the customer who owns the order)
//   not paid yet         -> order becomes "cancelled"
//   paid, nothing shipped -> order becomes "refunded", the money is returned and the stock restored
//   anything already shipped -> refused
exports.cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(404).json({ message: 'Order not found' });

  const order = await Order.findById(id);
  if (!order || !order.customer.equals(req.user._id)) return res.status(404).json({ message: 'Order not found' });

  const reason = String(req.body.reason || '').trim().slice(0, 200) || 'Cancelled by the customer';

  if (UNPAID.includes(order.paymentStatus)) {
    const cancelled = await cancelUnpaid(order._id, reason);
    if (cancelled) return res.json(cancelled);
  }

  const fresh = await Order.findById(id); // look again: the status may have changed meanwhile
  if (fresh.paymentStatus === 'processing') {
    return res.status(409).json({ message: 'A payment is in progress. Try again in a moment.' });
  }
  if (fresh.paymentStatus === 'cancelled' || fresh.paymentStatus === 'refunded') {
    return res.status(400).json({ message: 'This order is already cancelled' });
  }

  if (fresh.paymentStatus === 'paid') {
    // Only possible while no item has shipped (the check and the change happen in one step)
    const claimed = await Order.findOneAndUpdate(
      { _id: id, paymentStatus: 'paid', 'items.status': { $nin: ['shipped', 'delivered', 'cancelled'] } },
      { $set: { paymentStatus: 'refunded', refundedAt: new Date(), cancelledAt: new Date(), cancelReason: reason } },
      { new: true }
    );
    if (!claimed) {
      return res.status(400).json({
        message: 'Some items have already been shipped, so this order can no longer be cancelled. Please contact the seller.',
      });
    }
    const refund = await gateway.refund({ transactionId: claimed.transactionId, amount: claimed.totalPrice });
    claimed.refundId = refund.refundId;
    claimed.items.forEach((i) => {
      i.status = 'cancelled';
    });
    await claimed.save();
    await releaseStock(claimed.items);
    return res.json(claimed);
  }

  res.status(400).json({ message: 'This order cannot be cancelled' });
});

// ---------- read ----------

// GET /api/orders/mine   (customer)
exports.myOrders = asyncHandler(async (req, res) => {
  await expireStale({ customer: req.user._id });
  res.json(await Order.find({ customer: req.user._id }).sort('-createdAt'));
});

// GET /api/orders/:id   (owner, admin, or a vendor who sold something in it)
exports.getOrder = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Order not found' });
  await expireStale({ _id: req.params.id });
  const order = await Order.findById(req.params.id).populate('customer', 'name email');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (req.user.role === 'admin' || order.customer._id.equals(req.user._id)) return res.json(order);

  if (req.user.role === 'vendor') {
    const mine = order.items.some((i) => i.vendor.equals(req.user._id));
    if (mine) return res.json(vendorView(order, req.user._id));
  }
  res.status(403).json({ message: 'You cannot view this order' });
});

// GET /api/orders/vendor   (vendor): paid orders containing this vendor's items
exports.vendorOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ paymentStatus: 'paid', 'items.vendor': req.user._id })
    .populate('customer', 'name')
    .sort('-createdAt');
  res.json(orders.map((o) => vendorView(o, req.user._id)));
});

// ---------- fulfilment ----------

// PATCH /api/orders/:id/items/:itemId/status   (the vendor who owns the item)
// Body: { status: 'shipped' | 'delivered' }. Only moves forward: placed -> shipped -> delivered.
exports.updateItemStatus = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  if (!isValidObjectId(id) || !isValidObjectId(itemId)) {
    return res.status(404).json({ message: 'Order item not found' });
  }
  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.paymentStatus === 'cancelled' || order.paymentStatus === 'refunded') {
    return res.status(400).json({ message: 'This order was cancelled' });
  }
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

  // One atomic step: the change only happens if the order is still paid AND this exact item still has
  // the status we just read. So it can never overwrite a cancellation made at the same moment.
  const index = order.items.findIndex((i) => i._id.equals(item._id));
  const r = await Order.updateOne(
    {
      _id: id,
      paymentStatus: 'paid',
      [`items.${index}._id`]: item._id,
      [`items.${index}.vendor`]: req.user._id,
      [`items.${index}.status`]: item.status,
    },
    { $set: { [`items.${index}.status`]: next } }
  );
  if (r.modifiedCount !== 1) {
    return res.status(409).json({ message: 'This order just changed. Refresh the page and try again.' });
  }
  item.status = next;
  res.json(item);
});
