// Fills the database with demo data. WARNING: it deletes everything first
// (users, products, orders, reviews, images), then recreates the demo set.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Image = require('../models/Image');
const Review = require('../models/Review');
const Order = require('../models/Order');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A simple colored picture with the product name, so the demo shop never looks empty.
// Vendors can replace these with real photos from "My products".
function placeholderSvg(name, hue) {
  const words = name.split(' ');
  const mid = Math.ceil(words.length / 2);
  const lines = name.length > 13 && words.length > 1
    ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
    : [name];
  const text = lines
    .map((l, i) => `<text x="300" y="${lines.length === 1 ? 470 : 445 + i * 52}" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="hsl(${hue} 45% 20%)">${esc(l)}</text>`)
    .join('');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="hsl(${hue} 38% 89%)"/><circle cx="300" cy="230" r="130" fill="hsl(${hue} 42% 74%)"/><circle cx="300" cy="230" r="70" fill="hsl(${hue} 45% 62%)"/>${text}</svg>`
  );
}

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([
    User.deleteMany(), Category.deleteMany(), Product.deleteMany(),
    Image.deleteMany(), Review.deleteMany(), Order.deleteMany(),
  ]);

  // ---------- users ----------
  const mk = (data) => User.create(data);
  await mk({ name: 'Admin', email: 'admin@market.test', password: 'admin123', role: 'admin' });
  const customer = await mk({ name: 'Customer', email: 'customer@market.test', password: 'customer123' });
  const buyer = await mk({ name: 'Buyer', email: 'buyer@market.test', password: 'buyer123' });

  const vendorData = [
    { name: 'Vendor One', email: 'vendor@market.test', password: 'vendor123', storeName: 'Local Crafts', storeDescription: 'Handmade home goods.' },
    { name: 'Green Table', email: 'green@market.test', password: 'green123', storeName: 'Green Table', storeDescription: 'Pantry goods from small farms.' },
    { name: 'Noor', email: 'noor@market.test', password: 'noor123', storeName: 'Atelier Noor', storeDescription: 'Clothing and accessories made in small batches.' },
  ];
  const vendors = [];
  for (const v of vendorData) vendors.push(await mk({ ...v, role: 'vendor', vendorStatus: 'approved' }));
  // One store still waiting for approval, to demo the admin flow
  await mk({
    name: 'New Vendor', email: 'newvendor@market.test', password: 'test1234',
    role: 'vendor', storeName: 'Fresh Store', storeDescription: 'Fresh produce.', vendorStatus: 'pending',
  });

  // ---------- categories ----------
  const [clothing, home, food] = await Category.insertMany([
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Home & Decor', slug: 'home-decor' },
    { name: 'Food', slug: 'food' },
  ]);

  // ---------- products (with placeholder pictures) ----------
  const catalog = [
    // Local Crafts
    { v: 0, c: home, name: 'Ceramic Vase', price: 40, stock: 8, hue: 190, description: 'Hand-thrown ceramic vase with a soft matte glaze. Fits a small bunch of dried flowers.' },
    { v: 0, c: clothing, name: 'Handmade Scarf', price: 25, stock: 20, hue: 20, description: 'Soft wool scarf, woven by hand in small batches.' },
    { v: 0, c: home, name: 'Woven Basket', price: 28, stock: 6, hue: 40, description: 'Sturdy basket woven from natural fibres. Good for laundry, blankets or fruit.' },
    { v: 0, c: home, name: 'Soy Candle', price: 14, stock: 15, hue: 330, description: 'Hand-poured soy candle with a light cedar scent. Burns for about 40 hours.' },
    // Green Table
    { v: 1, c: food, name: 'Local Honey Jar', price: 12, stock: 50, hue: 45, description: 'Raw organic honey from nearby hives. 400 g jar.' },
    { v: 1, c: food, name: 'Olive Oil 500ml', price: 18, stock: 25, hue: 95, description: 'Cold-pressed extra virgin olive oil from this year\'s harvest.' },
    { v: 1, c: food, name: 'Zaatar Blend', price: 6.5, stock: 40, hue: 120, description: 'Traditional thyme, sesame and sumac blend. 150 g.' },
    { v: 1, c: food, name: 'Fig Jam', price: 9, stock: 3, hue: 300, description: 'Slow-cooked fig jam with no added pectin. 300 g jar.' },
    // Atelier Noor
    { v: 2, c: clothing, name: 'Linen Shirt', price: 48, stock: 10, hue: 210, description: 'Relaxed-fit linen shirt, pre-washed for softness.' },
    { v: 2, c: clothing, name: 'Embroidered Tote', price: 22, stock: 14, hue: 160, description: 'Cotton tote bag with hand embroidery. Holds a laptop and more.' },
    { v: 2, c: clothing, name: 'Knit Beanie', price: 16, stock: 0, hue: 0, description: 'Warm ribbed beanie. Sold out right now, new batch coming soon.' },
    { v: 2, c: clothing, name: 'Cotton Apron', price: 19, stock: 12, hue: 70, description: 'Heavy cotton apron with two deep pockets and adjustable straps.' },
  ];

  const products = {};
  for (const item of catalog) {
    const img = await Image.create({
      data: placeholderSvg(item.name, item.hue),
      contentType: 'image/svg+xml',
      owner: vendors[item.v]._id,
    });
    products[item.name] = await Product.create({
      vendor: vendors[item.v]._id,
      category: item.c._id,
      name: item.name,
      description: item.description,
      price: item.price,
      stock: item.stock,
      images: [`/api/images/${img._id}`],
    });
  }

  // ---------- reviews ----------
  const reviews = [
    ['Ceramic Vase', customer, 5, 'Beautiful and well made. Arrived safely packed.'],
    ['Ceramic Vase', buyer, 4, 'Lovely glaze, slightly smaller than I expected.'],
    ['Local Honey Jar', customer, 5, 'Best honey I have had in years.'],
    ['Local Honey Jar', buyer, 5, 'Rich flavour, will order again.'],
    ['Olive Oil 500ml', buyer, 4, 'Fresh and peppery.'],
    ['Linen Shirt', buyer, 5, 'Fits perfectly and the fabric is lovely.'],
    ['Handmade Scarf', customer, 3, 'Nice scarf, a little scratchy at first.'],
    ['Embroidered Tote', customer, 4, 'Sturdy, and the embroidery is gorgeous.'],
  ];
  for (const [name, user, rating, comment] of reviews) {
    await Review.create({ product: products[name]._id, user: user._id, rating, comment });
  }
  for (const id of new Set(reviews.map(([n]) => String(products[n]._id)))) {
    await Review.recalculate(new mongoose.Types.ObjectId(id));
  }

  // ---------- orders in different states ----------
  async function makeOrder({ who, lines, days, paid = true }) {
    const items = lines.map(([name, quantity, status = 'placed']) => {
      const p = products[name];
      return { product: p._id, vendor: p.vendor, name: p.name, image: p.images[0], price: p.price, quantity, status };
    });
    const when = daysAgo(days);
    const order = await Order.create({
      customer: who._id,
      items,
      shippingAddress: { fullName: who.name, address: '12 Main Street', city: 'Beirut', postalCode: '1100', country: 'Lebanon' },
      totalPrice: Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100,
      paymentStatus: paid ? 'paid' : 'pending',
      ...(paid ? { transactionId: 'sim_seed_' + Math.random().toString(16).slice(2, 10), cardLast4: '4242', paidAt: when } : {}),
      createdAt: when,
    });
    if (paid) {
      for (const [name, quantity] of lines) {
        await Product.updateOne({ _id: products[name]._id }, { $inc: { stock: -quantity } });
      }
    }
    return order;
  }

  await makeOrder({ who: customer, days: 5, lines: [['Ceramic Vase', 1, 'delivered'], ['Local Honey Jar', 2, 'shipped']] });
  await makeOrder({ who: buyer, days: 3, lines: [['Linen Shirt', 1, 'placed'], ['Olive Oil 500ml', 1, 'delivered']] });
  await makeOrder({ who: buyer, days: 1, lines: [['Embroidered Tote', 1, 'shipped'], ['Zaatar Blend', 2, 'placed']] });
  await makeOrder({ who: customer, days: 0, lines: [['Handmade Scarf', 2, 'placed'], ['Embroidered Tote', 1, 'placed']] });
  await makeOrder({ who: buyer, days: 0, paid: false, lines: [['Soy Candle', 1]] }); // never paid

  console.log('Seeded: 7 users, 3 categories, 12 products, 8 reviews, 5 orders.\n');
  console.log('Demo logins:');
  console.log('  admin     admin@market.test       admin123');
  console.log('  vendor    vendor@market.test      vendor123   (Local Crafts)');
  console.log('  vendor    green@market.test       green123    (Green Table)');
  console.log('  vendor    noor@market.test        noor123     (Atelier Noor)');
  console.log('  vendor    newvendor@market.test   test1234    (pending approval)');
  console.log('  customer  customer@market.test    customer123');
  console.log('  customer  buyer@market.test       buyer123');
  process.exit(0);
})().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
