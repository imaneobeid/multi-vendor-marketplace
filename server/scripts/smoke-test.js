// Automatic check of the whole backend against the RUNNING server.
// Usage: 1) npm run seed   2) npm run dev (other terminal)   3) npm run smoke   4) npm run seed (to reset)
require('dotenv').config();
const BASE = process.env.API_URL || 'http://localhost:5000';
let passed = 0;
let failed = 0;

const check = (name, ok, extra = '') => {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
};
const section = (t) => console.log(`\n${t}`);

async function call(method, path, { token, body, raw } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).data?.token;
const find = async (q) => (await call('GET', `/products?search=${encodeURIComponent(q)}`)).data.products[0];
const stockOf = async (id) => (await call('GET', `/products/${id}`)).data.stock;
const near = (a, b) => Math.abs(a - b) < 0.005;

const card = (number, extra = {}) => ({ number, expMonth: '12', expYear: '30', cvc: '123', ...extra });
const GOOD = card('4242 4242 4242 4242');
const ADDRESS = { fullName: 'Test Buyer', address: '1 Test Street', city: 'Beirut', postalCode: '1100', country: 'Lebanon' };

async function newOrder(token, productId, quantity = 1) {
  return call('POST', '/orders', { token, body: { items: [{ productId, quantity }], shippingAddress: ADDRESS } });
}
const pay = (token, orderId, c) => call('POST', `/orders/${orderId}/pay`, { token, body: { card: c } });
const getOrder = async (token, id) => (await call('GET', `/orders/${id}`, { token })).data;

// Makes an order look old, to check that unpaid orders expire (needs MONGO_URI in .env)
async function ageOrder(id, hours) {
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGO_URI);
  await mongoose.connection.collection('orders').updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { $set: { createdAt: new Date(Date.now() - hours * 3600 * 1000) } }
  );
  await mongoose.disconnect();
}

(async () => {
  console.log(`Smoke test against ${BASE}`);

  // ------------------------------------------------------------------
  section('Server and logins');
  try {
    check('server is up', (await call('GET', '/health')).status === 200);
  } catch {
    console.log('  Cannot reach the server. Start it with "npm run dev" first.');
    process.exit(1);
  }
  const admin = await login('admin@market.test', 'admin123');
  const vendor1 = await login('vendor@market.test', 'vendor123');   // Local Crafts
  const vendor2 = await login('green@market.test', 'green123');     // Green Table
  const vendor3 = await login('noor@market.test', 'noor123');       // Atelier Noor
  const pending = await login('newvendor@market.test', 'test1234');
  const customer = await login('customer@market.test', 'customer123');
  const buyer = await login('buyer@market.test', 'buyer123');
  check('all demo accounts can log in', [admin, vendor1, vendor2, vendor3, pending, customer, buyer].every(Boolean), '(did you run "npm run seed"?)');
  check('wrong password is rejected (401)', (await call('POST', '/auth/login', { body: { email: 'admin@market.test', password: 'nope' } })).status === 401);
  check('cannot register as admin (400)', (await call('POST', '/auth/register', { body: { name: 'x', email: 'x@x.test', password: 'secret1', role: 'admin' } })).status === 400);
  check('duplicate email is refused (409)', (await call('POST', '/auth/register', { body: { name: 'x', email: 'customer@market.test', password: 'secret1' } })).status === 409);

  section('Authentication and tokens');
  const me = await call('GET', '/auth/me', { token: customer });
  check('/auth/me never returns the password', me.status === 200 && !JSON.stringify(me.data).toLowerCase().includes('password'));
  check('no token -> 401', (await call('GET', '/auth/me')).status === 401);
  check('garbage token -> 401', (await call('GET', '/auth/me', { token: 'not.a.token' })).status === 401);
  const tampered = customer.slice(0, -3) + (customer.endsWith('abc') ? 'xyz' : 'abc');
  check('tampered token -> 401', (await call('GET', '/auth/me', { token: tampered })).status === 401);
  check('login with an object instead of text -> 400', (await call('POST', '/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } })).status === 400);
  check('login with a list instead of text -> 400', (await call('POST', '/auth/login', { body: { email: ['a@b.c'], password: 'x' } })).status === 400);
  check('query with an operator -> 400', (await call('GET', '/products?category[$ne]=x')).status === 400);
  check('query with a list -> 400', (await call('GET', '/products?search=a&search=b')).status === 400);

  // ------------------------------------------------------------------
  section('Catalog');
  const all = (await call('GET', '/products?limit=50')).data;
  check('21 products in the shop', all.total === 21, `(got ${all.total})`);
  check('search "copper" finds 1 product', (await call('GET', '/products?search=copper')).data.total === 1);
  check('category "food" has 6 products', (await call('GET', '/products?category=food')).data.total === 6);
  check('sorting by price puts Linen Shirt first', (await call('GET', '/products?sort=price_desc&limit=1')).data.products[0]?.name === 'Linen Shirt');
  const cheap = (await call('GET', '/products?minPrice=10&maxPrice=20')).data.products;
  check('price filter 10 to 20 works', cheap.length > 0 && cheap.every((p) => p.price >= 10 && p.price <= 20));
  const candle = await find('cedar candle');
  if (candle.images && candle.images[0]) {
    const img = await fetch(`${BASE}${candle.images[0]}`);
    check('product image is served', img.status === 200 && (img.headers.get('content-type') || '').includes('image'));
  } else {
    console.log('  SKIP  product image check (the demo data has no photos yet)');
  }

  // ------------------------------------------------------------------
  section('Roles and permissions');
  const shirt = await find('linen shirt'); // belongs to Atelier Noor
  check('customer cannot open the admin report (403)', (await call('GET', '/admin/stats', { token: customer })).status === 403);
  check('vendor cannot open the admin report (403)', (await call('GET', '/admin/stats', { token: vendor1 })).status === 403);
  check('customer cannot open the vendor dashboard (403)', (await call('GET', '/vendor/stats', { token: customer })).status === 403);
  check('customer cannot create products (403)', (await call('POST', '/products', { token: customer, body: {} })).status === 403);
  check('unapproved vendor cannot create products (403)', (await call('POST', '/products', { token: pending, body: {} })).status === 403);
  check('vendor cannot edit another vendor\'s product (403)', (await call('PUT', `/products/${shirt._id}`, { token: vendor1, body: { price: 1 } })).status === 403);
  check('vendor cannot delete another vendor\'s product (403)', (await call('DELETE', `/products/${shirt._id}`, { token: vendor1 })).status === 403);
  check('vendor cannot place orders (403)', (await newOrder(vendor1, candle._id)).status === 403);
  check('customer cannot approve vendors (403)', (await call('PATCH', '/admin/vendors/000000000000000000000000/status', { token: customer, body: { status: 'approved' } })).status === 403);
  check('product price cannot be negative (400)', (await call('PUT', `/products/${candle._id}`, { token: vendor1, body: { price: -5 } })).status === 400);
  check('product stock cannot be negative (400)', (await call('PUT', `/products/${candle._id}`, { token: vendor1, body: { stock: -1 } })).status === 400);

  // ------------------------------------------------------------------
  section('Payments: every outcome');
  let before = await stockOf(candle._id);
  let r = await newOrder(customer, candle._id, 2);
  check('order is created (201)', r.status === 201, JSON.stringify(r.data));
  check('server uses the database price, not the browser price', near(r.data?.totalPrice, candle.price * 2));
  check('new order starts as "pending"', r.data?.paymentStatus === 'pending');
  const order1 = r.data?._id;
  const item1 = r.data?.items?.[0]?._id;

  r = await pay(customer, order1, card('1234 5678 9012 3456'));
  check('invalid card number is refused (400)', r.status === 400);
  r = await pay(customer, order1, card('4242 4242 4242 4242', { cvc: '12' }));
  check('invalid CVC is refused (400)', r.status === 400);
  r = await pay(customer, order1, card('4242 4242 4242 4242', { expYear: '20' }));
  check('expired date is refused (400)', r.status === 400);
  let o = await getOrder(customer, order1);
  check('typing mistakes change nothing: order still "pending", stock untouched', o.paymentStatus === 'pending' && o.paymentAttempts.length === 0 && (await stockOf(candle._id)) === before);

  const failures = [
    ['4000 0000 0000 0002', 'card_declined'],
    ['4000 0000 0000 9995', 'insufficient_funds'],
    ['4000 0000 0000 0069', 'expired_card'],
    ['4000 0000 0000 0127', 'incorrect_cvc'],
    ['4000 0000 0000 0119', 'processing_error'],
  ];
  let attempts = 0;
  for (const [number, code] of failures) {
    r = await pay(customer, order1, card(number));
    attempts++;
    o = await getOrder(customer, order1);
    check(`${code}: 402, order "failed", attempt recorded, stock untouched`,
      r.status === 402 && r.data?.code === code && o.paymentStatus === 'failed' && o.paymentAttempts.length === attempts && (await stockOf(candle._id)) === before,
      JSON.stringify({ status: r.status, code: r.data?.code, order: o.paymentStatus }));
  }

  r = await pay(customer, order1, card('4111 1111 1111 1111'));
  check('after failures, a good card (Visa 4111...) pays the same order', r.status === 200 && r.data?.paymentStatus === 'paid', JSON.stringify(r.data));
  o = await getOrder(customer, order1);
  check('paid order keeps the full attempt history (5 failed + 1 success)', o.paymentAttempts.length === 6 && o.paymentAttempts[5].success === true && o.paymentAttempts.slice(0, 5).every((a) => !a.success));
  check('paid order has a transaction id and the last 4 digits only', !!o.transactionId && o.cardLast4 === '1111' && !JSON.stringify(o).includes('4111111111111111'));
  check('stock went down by exactly 2', (await stockOf(candle._id)) === before - 2);
  check('paying twice is refused (400)', (await pay(customer, order1, GOOD)).status === 400);
  check('Mastercard test number is accepted', (await pay(buyer, (await newOrder(buyer, candle._id)).data._id, card('5555 5555 5555 4444'))).status === 200);

  section('Payments: cannot be abused');
  r = await newOrder(customer, candle._id);
  const mine = r.data._id;
  check('another customer cannot pay my order (404)', (await pay(buyer, mine, GOOD)).status === 404);
  check('another customer cannot view my order (403)', (await call('GET', `/orders/${mine}`, { token: buyer })).status === 403);
  check('another customer cannot cancel my order (404)', (await call('POST', `/orders/${mine}/cancel`, { token: buyer })).status === 404);
  check('a vendor cannot pay an order (403)', (await pay(vendor1, mine, GOOD)).status === 403);
  before = await stockOf(candle._id);
  const both = await Promise.all([pay(customer, mine, GOOD), pay(customer, mine, GOOD)]);
  const codes = both.map((x) => x.status).sort();
  check('double click: exactly one payment goes through', codes[0] === 200 && (codes[1] === 400 || codes[1] === 409), JSON.stringify(codes));
  check('double click: stock reduced once, not twice', (await stockOf(candle._id)) === before - 1);
  const paidOnce = await getOrder(customer, mine);
  check('double click: only one successful attempt on record', paidOnce.paymentAttempts.filter((a) => a.success).length === 1);

  // ------------------------------------------------------------------
  section('Cancelled payments and orders');
  before = await stockOf(candle._id);
  r = await newOrder(customer, candle._id);
  const cancelMe = r.data._id;
  r = await call('POST', `/orders/${cancelMe}/cancel`, { token: customer, body: { reason: 'Changed my mind' } });
  check('cancelling an unpaid order works', r.status === 200 && r.data.paymentStatus === 'cancelled' && r.data.items.every((i) => i.status === 'cancelled'));
  check('cancelled order records the reason and time', r.data.cancelReason === 'Changed my mind' && !!r.data.cancelledAt);
  check('a cancelled order cannot be paid (400)', (await pay(customer, cancelMe, GOOD)).status === 400);
  check('cancelling twice is refused (400)', (await call('POST', `/orders/${cancelMe}/cancel`, { token: customer })).status === 400);
  check('stock is untouched by an unpaid cancellation', (await stockOf(candle._id)) === before);

  const first = (await newOrder(customer, candle._id)).data._id;
  await newOrder(customer, candle._id); // a new order replaces the abandoned one
  const replaced = await getOrder(customer, first);
  check('starting a new order cancels the abandoned unpaid one', replaced.paymentStatus === 'cancelled' && replaced.cancelReason === 'Replaced by a newer order');

  // a declined order can be cancelled too
  const failedOne = (await newOrder(customer, candle._id)).data._id;
  await pay(customer, failedOne, card('4000 0000 0000 0002'));
  r = await call('POST', `/orders/${failedOne}/cancel`, { token: customer });
  check('a payment that failed can be cancelled', r.status === 200 && r.data.paymentStatus === 'cancelled');

  // unpaid orders expire
  const stale = (await newOrder(customer, candle._id)).data._id;
  if (process.env.MONGO_URI) {
    await ageOrder(stale, 25);
    const expired = await getOrder(customer, stale);
    check('an unpaid order older than 24 hours is cancelled automatically', expired.paymentStatus === 'cancelled' && /24 hours/.test(expired.cancelReason || ''));
  } else {
    console.log('  SKIP  expiry check (MONGO_URI not available)');
  }

  // paid order: cancel before shipping -> refund and restock
  before = await stockOf(candle._id);
  const refundMe = (await newOrder(customer, candle._id, 2)).data._id;
  await pay(customer, refundMe, GOOD);
  check('paid order took the stock', (await stockOf(candle._id)) === before - 2);
  r = await call('POST', `/orders/${refundMe}/cancel`, { token: customer, body: { reason: 'Ordered by mistake' } });
  check('cancelling a paid order (nothing shipped) refunds it', r.status === 200 && r.data.paymentStatus === 'refunded' && !!r.data.refundId && !!r.data.refundedAt);
  check('refunded order: every item is cancelled', r.data.items.every((i) => i.status === 'cancelled'));
  check('refund put the stock back', (await stockOf(candle._id)) === before);
  check('vendor no longer sees the refunded order', !(await call('GET', '/orders/vendor', { token: vendor1 })).data.some((x) => x._id === refundMe));
  check('vendor cannot ship a refunded order (400)', (await call('PATCH', `/orders/${refundMe}/items/${r.data.items[0]._id}/status`, { token: vendor1, body: { status: 'shipped' } })).status === 400);
  check('a refunded order cannot be paid again (400)', (await pay(customer, refundMe, GOOD)).status === 400);
  check('refunding twice is refused (400)', (await call('POST', `/orders/${refundMe}/cancel`, { token: customer })).status === 400);

  // shipped: cannot cancel
  const shipMe = (await newOrder(customer, candle._id)).data;
  await pay(customer, shipMe._id, GOOD);
  await call('PATCH', `/orders/${shipMe._id}/items/${shipMe.items[0]._id}/status`, { token: vendor1, body: { status: 'shipped' } });
  r = await call('POST', `/orders/${shipMe._id}/cancel`, { token: customer });
  check('an order with shipped items cannot be cancelled (400)', r.status === 400 && /shipped/.test(r.data?.message || ''));
  check('...and it stays paid', (await getOrder(customer, shipMe._id)).paymentStatus === 'paid');

  // ------------------------------------------------------------------
  section('Inventory');
  r = await newOrder(customer, candle._id, 9999);
  check('cannot order more than 100 at once (400)', r.status === 400);
  const stockNow = await stockOf(candle._id);
  r = await newOrder(customer, candle._id, stockNow + 1);
  check('cannot order more than the stock (409)', r.status === 409);
  const beanie = await find('beanie');
  check('sold-out product cannot be ordered (409)', (await newOrder(customer, beanie._id)).status === 409);

  const honey = await find('wild thyme honey');
  await call('PUT', `/products/${honey._id}`, { token: vendor2, body: { stock: 1 } });
  const oa = (await newOrder(customer, honey._id)).data._id;
  const ob = (await newOrder(buyer, honey._id)).data._id;
  const race = await Promise.all([pay(customer, oa, GOOD), pay(buyer, ob, GOOD)]);
  const raceCodes = race.map((x) => x.status).sort();
  check('last item: two customers pay at once, only one succeeds', raceCodes[0] === 200 && raceCodes[1] === 409, JSON.stringify(raceCodes));
  check('last item: stock is exactly 0, never negative', (await stockOf(honey._id)) === 0);
  const loserId = race[0].status === 409 ? oa : ob;
  const loserToken = race[0].status === 409 ? customer : buyer;
  const loser = await getOrder(loserToken, loserId);
  check('the customer who lost is not charged: order stays unpaid with no successful attempt', loser.paymentStatus === 'pending' && loser.paymentAttempts.length === 0);
  await call('PUT', `/products/${honey._id}`, { token: vendor2, body: { stock: 20 } });

  // ------------------------------------------------------------------
  section('Reviews');
  r = await call('POST', `/products/${candle._id}/reviews`, { token: customer, body: { rating: 5, comment: 'Smells great' } });
  check('customer can review (200/201)', r.status === 200 || r.status === 201, JSON.stringify(r.data));
  const rated = (await call('GET', `/products/${candle._id}`)).data;
  check('average rating updated', rated.numReviews === 1 && rated.avgRating === 5);
  check('vendor cannot review (403)', (await call('POST', `/products/${candle._id}/reviews`, { token: vendor1, body: { rating: 5 } })).status === 403);
  check('rating 9 is refused (400)', (await call('POST', `/products/${candle._id}/reviews`, { token: customer, body: { rating: 9 } })).status === 400);

  // ------------------------------------------------------------------
  section('Fulfilment and privacy');
  const vOrders = (await call('GET', '/orders/vendor', { token: vendor1 })).data;
  check('vendor sees the paid order', Array.isArray(vOrders) && vOrders.some((x) => x._id === order1));
  check('another vendor does not see it', !(await call('GET', '/orders/vendor', { token: vendor2 })).data.some((x) => x._id === order1));
  check('another vendor cannot ship it (403)', (await call('PATCH', `/orders/${order1}/items/${item1}/status`, { token: vendor2, body: { status: 'shipped' } })).status === 403);
  check('cannot skip straight to delivered (400)', (await call('PATCH', `/orders/${order1}/items/${item1}/status`, { token: vendor1, body: { status: 'delivered' } })).status === 400);
  check('vendor marks it shipped', (await call('PATCH', `/orders/${order1}/items/${item1}/status`, { token: vendor1, body: { status: 'shipped' } })).status === 200);
  check('vendor marks it delivered', (await call('PATCH', `/orders/${order1}/items/${item1}/status`, { token: vendor1, body: { status: 'delivered' } })).status === 200);
  check('delivered stays delivered (400)', (await call('PATCH', `/orders/${order1}/items/${item1}/status`, { token: vendor1, body: { status: 'shipped' } })).status === 400);
  const vView = await call('GET', `/orders/${order1}`, { token: vendor1 });
  const vText = JSON.stringify(vView.data);
  check('vendor sees the order but no payment details or customer email', vView.status === 200 && !/transactionId|cardLast4|paymentAttempts|refundId|@market\.test/.test(vText), vText.slice(0, 120));
  check('a vendor cannot open an order that has none of their items (403)', (await call('GET', `/orders/${order1}`, { token: vendor3 })).status === 403);
  check('admin can open any order', (await call('GET', `/orders/${order1}`, { token: admin })).status === 200);

  // ------------------------------------------------------------------
  if (!process.env.SKIP_STATS) {
    section('Dashboards');
    const vs = (await call('GET', '/vendor/stats', { token: vendor1 })).data;
    check('vendor dashboard has sales, and refunded orders are not counted', vs?.totals?.revenue > 0 && vs.products.length === 5);
    const as = (await call('GET', '/admin/stats', { token: admin })).data;
    check('admin report has sales and 1 pending vendor', as?.orders?.paid >= 5 && as.vendors.pending === 1);
  } else {
    console.log('\nDashboards\n  SKIP  (SKIP_STATS is set: the test database has no aggregation support)');
  }

  // ------------------------------------------------------------------
  section('Vendor approval hides and blocks products');
  const approved = (await call('GET', '/admin/vendors?status=approved', { token: admin })).data;
  const green = approved.find((v) => v.storeName === 'Green Table');
  const olive = await find('extra virgin');
  check('found the Green Table vendor', !!green && !!olive);
  check('admin can reject a vendor', (await call('PATCH', `/admin/vendors/${green._id}/status`, { token: admin, body: { status: 'rejected' } })).status === 200);
  check('their products disappear from the shop', (await call('GET', '/products?category=food')).data.total === 0);
  check('their product page is gone (404)', (await call('GET', `/products/${olive._id}`)).status === 404);
  check('their products cannot be ordered (400)', (await newOrder(customer, olive._id)).status === 400);
  check('admin can approve them again', (await call('PATCH', `/admin/vendors/${green._id}/status`, { token: admin, body: { status: 'approved' } })).status === 200);
  check('products are back in the shop', (await call('GET', '/products?category=food')).data.total === 6);

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed) console.log('Copy the FAIL lines and send them to me.');
  else console.log('Everything works. Run "npm run seed" to reset the demo data.');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('Test crashed:', e.message);
  process.exit(1);
});
