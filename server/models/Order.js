const mongoose = require('mongoose');

// Each item carries its vendor, so a vendor's dashboard is just
// "orders where items.vendor == me". No sub-order documents needed.
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  image: String,
  price: { type: Number, required: true }, // price snapshot at purchase time
  quantity: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['placed', 'shipped', 'delivered', 'cancelled'],
    default: 'placed',
  },
});

// One entry per card attempt, so the order shows exactly what happened
const paymentAttemptSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    success: Boolean,
    code: String, // e.g. card_declined, insufficient_funds
    message: String,
    last4: String,
    brand: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: String,
      address: String,
      city: String,
      postalCode: String,
      country: String,
    },
    totalPrice: { type: Number, required: true },

    // pending    -> created, not paid yet
    // processing -> a payment is being made right now (blocks double payment)
    // paid       -> payment succeeded
    // failed     -> the last payment attempt was declined (the customer can try again)
    // cancelled  -> cancelled before it was paid
    // refunded   -> paid, then cancelled before shipping; money returned, stock restored
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentAttempts: { type: [paymentAttemptSchema], default: [] },
    processingAt: Date,

    // Filled in when the (simulated) payment succeeds. We never store the full card number.
    transactionId: String,
    cardLast4: String,
    paidAt: Date,

    cancelledAt: Date,
    cancelReason: String,
    refundedAt: Date,
    refundId: String,
  },
  { timestamps: true }
);

orderSchema.index({ 'items.vendor': 1 });

module.exports = mongoose.model('Order', orderSchema);
