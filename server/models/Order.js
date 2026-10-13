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
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    // Filled in when the (simulated) payment succeeds. We never store the full card number.
    transactionId: String,
    cardLast4: String,
    paidAt: Date,
  },
  { timestamps: true }
);

orderSchema.index({ 'items.vendor': 1 });

module.exports = mongoose.model('Order', orderSchema);
