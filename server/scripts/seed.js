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
const fs = require('fs');
const path = require('path');

const IMAGE_DIR = path.join(__dirname, '..', 'seed-images');
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Looks for seed-images/<slug>.jpg (and <slug>-2.jpg ... <slug>-4.jpg for extra photos)
function realPhotos(name) {
  const found = [];
  const slug = slugify(name);
  for (let n = 1; n <= 4; n++) {
    const base = n === 1 ? slug : `${slug}-${n}`;
    for (const ext of Object.keys(MIME)) {
      const file = path.join(IMAGE_DIR, base + ext);
      if (fs.existsSync(file)) {
        const data = fs.readFileSync(file);
        if (data.length > 1.5 * 1024 * 1024) console.warn(`  Note: ${base + ext} is large (${Math.round(data.length / 1024)} KB). Smaller files load faster.`);
        found.push({ data, contentType: MIME[ext] });
        break;
      }
    }
  }
  return found;
}

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
    { name: 'Tripoli Soap House', email: 'soap@market.test', password: 'soap123', storeName: 'Tripoli Soap House', storeDescription: 'Olive oil soaps and natural care products, made the traditional way.' },
  ];
  const vendors = [];
  for (const v of vendorData) vendors.push(await mk({ ...v, role: 'vendor', vendorStatus: 'approved' }));
  // One store still waiting for approval, to demo the admin flow
  await mk({
    name: 'New Vendor', email: 'newvendor@market.test', password: 'test1234',
    role: 'vendor', storeName: 'Fresh Store', storeDescription: 'Fresh produce.', vendorStatus: 'pending',
  });

  // ---------- categories ----------
  const [clothing, home, food, beauty] = await Category.insertMany([
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Home & Decor', slug: 'home-decor' },
    { name: 'Food', slug: 'food' },
    { name: 'Beauty & Care', slug: 'beauty-care' },
  ]);

  // ---------- products (with placeholder pictures) ----------
  const catalog = [
    // Local Crafts
    { v: 0, c: home, name: 'Copper Coffee Pot', price: 22, stock: 9, hue: 25, description: 'Traditional hand-hammered rakwe for making Arabic coffee. Holds about four small cups. Tin-lined inside.' },
    { v: 0, c: home, name: 'Hand-painted Ceramic Bowl', price: 18, stock: 12, hue: 200, description: 'Glazed ceramic bowl painted by hand, so no two are exactly alike. Safe for food. 18 cm wide.' },
    { v: 0, c: home, name: 'Olive Wood Cutting Board', price: 26, stock: 7, hue: 35, description: 'Cut from a single piece of olive wood, with a natural grain pattern. Finished with food-safe oil.' },
    { v: 0, c: home, name: 'Handwoven Straw Basket', price: 20, stock: 6, hue: 48, description: 'Sturdy basket woven from natural straw. Good for bread, fruit or storage.' },
    { v: 0, c: home, name: 'Cedar Candle', price: 12, stock: 15, hue: 330, description: 'Hand-poured soy candle with a light cedar scent. Burns for about 40 hours.' },
    // Green Table
    { v: 1, c: food, name: "Za'atar Mix", price: 5.5, stock: 40, hue: 120, description: 'Wild thyme, toasted sesame and sumac, blended the traditional way. 250 g bag.' },
    { v: 1, c: food, name: 'Extra Virgin Olive Oil', price: 14, stock: 25, hue: 95, description: 'Cold-pressed olive oil from this season\'s harvest. Fruity and slightly peppery. 1 litre tin.' },
    { v: 1, c: food, name: 'Wild Thyme Honey', price: 16, stock: 3, hue: 45, description: 'Raw honey from mountain hives. Thick, floral and never heated. 500 g jar.' },
    { v: 1, c: food, name: 'Pomegranate Molasses', price: 6, stock: 30, hue: 350, description: 'Tart and sweet syrup made from slowly reduced pomegranate juice. 300 ml bottle.' },
    { v: 1, c: food, name: 'Orange Blossom Water', price: 4.5, stock: 35, hue: 28, description: 'Distilled from spring orange blossoms. Perfect for sweets and drinks. 250 ml bottle.' },
    { v: 1, c: food, name: 'Tahini Jar', price: 7.5, stock: 22, hue: 55, description: 'Smooth tahini stone-ground from hulled sesame, with nothing added. 500 g jar.' },
    // Atelier Noor
    { v: 2, c: clothing, name: 'Embroidered Tote Bag', price: 24, stock: 14, hue: 160, description: 'Cotton tote with hand embroidery in traditional cross-stitch. Holds a laptop and more.' },
    { v: 2, c: clothing, name: 'Hand-knit Wool Scarf', price: 28, stock: 20, hue: 15, description: 'Warm scarf knitted by hand from soft wool. Long enough to wrap twice.' },
    { v: 2, c: clothing, name: 'Linen Shirt', price: 46, stock: 10, hue: 210, description: 'Relaxed-fit linen shirt, pre-washed for softness. Cool in summer.' },
    { v: 2, c: clothing, name: 'Cotton Apron', price: 18, stock: 12, hue: 75, description: 'Heavy cotton apron with two deep pockets and adjustable straps.' },
    { v: 2, c: clothing, name: 'Wool Beanie', price: 16, stock: 0, hue: 0, description: 'Warm ribbed beanie. Sold out right now, a new batch is on the way.' },
    { v: 2, c: home, name: 'Tatreez Cushion Cover', price: 30, stock: 8, hue: 340, description: 'Linen cushion cover with tatreez embroidery in red thread. Fits a 45 cm cushion.' },
    // Tripoli Soap House
    { v: 3, c: beauty, name: 'Olive Oil Soap Bar', price: 4, stock: 60, hue: 90, description: 'Gentle bar made the old way from olive oil, cut and dried by hand. About 150 g.' },
    { v: 3, c: beauty, name: 'Laurel Soap Bar', price: 6, stock: 40, hue: 140, description: 'Olive oil soap with laurel berry oil. Rich lather, good for skin and hair. About 150 g.' },
    { v: 3, c: beauty, name: 'Rose Water Face Mist', price: 9, stock: 18, hue: 355, description: 'Pure rose water in a spray bottle. Refreshing on warm days. 100 ml.' },
    { v: 3, c: beauty, name: 'Beeswax Lip Balm', price: 4, stock: 45, hue: 50, description: 'Beeswax and olive oil lip balm with no fragrance. 15 g tin.' },
  ];

  const products = {};
  const usedPlaceholder = [];
  let realCount = 0;
  for (const item of catalog) {
    let photos = realPhotos(item.name);
    if (photos.length) realCount++;
    else {
      usedPlaceholder.push(slugify(item.name));
      photos = [{ data: placeholderSvg(item.name, item.hue), contentType: 'image/svg+xml' }];
    }
    const urls = [];
    for (const ph of photos) {
      const img = await Image.create({ ...ph, size: ph.data.length, owner: vendors[item.v]._id });
      urls.push(`/api/images/${img._id}`);
    }
    products[item.name] = await Product.create({
      vendor: vendors[item.v]._id,
      category: item.c._id,
      name: item.name,
      description: item.description,
      price: item.price,
      stock: item.stock,
      images: urls,
    });
  }

  // ---------- reviews ----------
  const reviews = [
    ['Copper Coffee Pot', customer, 5, 'Beautiful and well made. Makes a proper cup of coffee.'],
    ['Copper Coffee Pot', buyer, 4, 'Lovely finish, a little smaller than I expected.'],
    ['Wild Thyme Honey', customer, 5, 'The best honey I have had in years.'],
    ['Wild Thyme Honey', buyer, 5, 'Rich flavour, will order again.'],
    ['Extra Virgin Olive Oil', buyer, 4, 'Fresh and peppery. Great on salads.'],
    ['Linen Shirt', buyer, 5, 'Fits perfectly and the fabric is lovely.'],
    ['Hand-knit Wool Scarf', customer, 3, 'Nice scarf, a little scratchy at first.'],
    ['Embroidered Tote Bag', customer, 4, 'Sturdy, and the embroidery is gorgeous.'],
    ['Olive Oil Soap Bar', buyer, 5, 'Gentle on my skin and lasts for weeks.'],
    ["Za'atar Mix", customer, 5, 'Tastes like my grandmother\'s.'],
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

  await makeOrder({ who: customer, days: 5, lines: [['Copper Coffee Pot', 1, 'delivered'], ['Wild Thyme Honey', 2, 'shipped']] });
  await makeOrder({ who: buyer, days: 3, lines: [['Linen Shirt', 1, 'placed'], ['Extra Virgin Olive Oil', 1, 'delivered']] });
  await makeOrder({ who: buyer, days: 1, lines: [['Embroidered Tote Bag', 1, 'shipped'], ["Za'atar Mix", 2, 'placed'], ['Olive Oil Soap Bar', 3, 'placed']] });
  await makeOrder({ who: customer, days: 0, lines: [['Hand-knit Wool Scarf', 2, 'placed'], ['Embroidered Tote Bag', 1, 'placed']] });
  await makeOrder({ who: buyer, days: 0, paid: false, lines: [['Cedar Candle', 1]] }); // never paid

  console.log(`Seeded: 8 users, 4 categories, ${catalog.length} products, ${reviews.length} reviews, 5 orders.`);
  console.log(`Photos: ${realCount} products use your pictures from seed-images/, ${usedPlaceholder.length} use a placeholder.`);
  if (usedPlaceholder.length) console.log('  Missing photos for: ' + usedPlaceholder.join(', ') + '\n  (see seed-images/README.txt)');
  console.log('');
  console.log('Demo logins:');
  console.log('  admin     admin@market.test       admin123');
  console.log('  vendor    vendor@market.test      vendor123   (Local Crafts)');
  console.log('  vendor    green@market.test       green123    (Green Table)');
  console.log('  vendor    noor@market.test        noor123     (Atelier Noor)');
  console.log('  vendor    soap@market.test        soap123     (Tripoli Soap House)');
  console.log('  vendor    newvendor@market.test   test1234    (pending approval)');
  console.log('  customer  customer@market.test    customer123');
  console.log('  customer  buyer@market.test       buyer123');
  process.exit(0);
})().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
