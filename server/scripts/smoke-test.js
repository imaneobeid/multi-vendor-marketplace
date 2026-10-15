// Automatic check of the whole backend against the RUNNING server.
// Usage: 1) npm run seed   2) npm run dev (other terminal)   3) npm run smoke   4) npm run seed (to reset)
const BASE = process.env.API_URL || 'http://localhost:5000';
let passed = 0;
let failed = 0;

const check = (name, ok, extra = '') => {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
};
const section = (t) => console.log(`\n${t}`);

async function call(method, path, { token, body } = {}) {
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
const near = (a, b) => Math.abs(a - b) < 0.005;

const GOOD_CARD = { number: '4242 4242 4242 4242', expMonth: '12', expYear: '30', cvc: '123' };
const BAD_CARD = { number: '4000 0000 0000 0002', expMonth: '12', expYear: '30', cvc: '123' };
const ADDRESS = { fullName: 'Test Buyer', address: '1 Test Street', city: 'Beirut', postalCode: '1100', country: 'Lebanon' };

(async () => {
  console.log(`Smoke test against ${BASE}`);

  section('Server and logins');
  try {
    check('server is up', (await call('GET', '/health')).status === 200);
  } catch {
    console.log('  Cannot reach the server. Start it with "npm run dev" first.');
    process.exit(1);
  }
  const admin = await login('admin@market.test', 'admin123');
  const vendor1 = await login('vendor@market.test', 'vendor123');
  const vendor2 = await login('green@market.test', 'green123');
  const pending = await login('newvendor@market.test', 'test1234');
  const customer = await login('customer@market.test', 'customer123');
  check('admin, vendors and customer can log in', [admin, vendor1, vendor2, pending, customer].every(Boolean), '(did you run "npm run seed"?)');
  check('wrong password is rejected (401)', (await call('POST', '/auth/login', { body: { email: 'admin@market.test', password: 'nope' } })).status === 401);
  check('cannot register as admin (400)', (await call('POST', '/auth/register', { body: { name: 'x', email: 'x@x.test', password: 'secret1', role: 'admin' } })).status === 400);

  section('Catalog');
  const all = (await call('GET', '/products?limit=50')).data;
  check('21 products in the shop', all.total === 21, `(got ${all.total})`);
  check('search "copper" finds 1 product', (await call('GET', '/products?search=copper')).data.total === 1);
  check('category "food" has 6 products', (await call('GET', '/products?category=food')).data.total === 6);
  const expensive = (await call('GET', '/products?sort=price_desc&limit=1')).data.products[0];
  check('sorting by price puts Linen Shirt first', expensive?.name === 'Linen Shirt');
  const cheap = (await call('GET', '/products?minPrice=10&maxPrice=20')).data.products;
  check('price filter 10 to 20 works', cheap.length > 0 && cheap.every((p) => p.price >= 10 && p.price <= 20));
  const candle = await find('cedar candle');
  const img = await fetch(`${BASE}${candle.images[0]}`);
  check('product image is served', img.status === 200 && (img.headers.get('content-type') || '').includes('image'));

  section('Who can do what');
  check('no token -> 401', (await call('GET', '/orders/mine')).status === 401);
  check('customer cannot open admin report (403)', (await call('GET', '/admin/stats', { token: customer })).status === 403);
  check('customer cannot create products (403)', (await call('POST', '/products', { token: customer, body: {} })).status === 403);
  check('unapproved vendor cannot create products (403)', (await call('POST', '/products', { token: pending, body: {} })).status === 403);

  section('Buying: prices, stock and payment');
  const before = candle.stock;
  let r = await call('POST', '/orders', {
    token: customer,
    body: { items: [{ productId: candle._id, quantity: 2, price: 0.01 }], shippingAddress: ADDRESS },
  });
  check('order is created (201)', r.status === 201, JSON.stringify(r.data));
  check('server uses the database price, not the browser price', near(r.data?.totalPrice, candle.price * 2));
  const orderId = r.data?._id;
  const itemId = r.data?.items?.[0]?._id;

  r = await call('POST', `/orders/${orderId}/pay`, { token: customer, body: { card: BAD_CARD } });
  check('declined card -> 402', r.status === 402);
  check('stock unchanged after a decline', (await call('GET', `/products/${candle._id}`)).data.stock === before);

  r = await call('POST', `/orders/${orderId}/pay`, { token: customer, body: { card: GOOD_CARD } });
  check('test card pays the order', r.status === 200 && r.data.paymentStatus === 'paid', JSON.stringify(r.data));
  check('stock went down by 2', (await call('GET', `/products/${candle._id}`)).data.stock === before - 2);
  check('paying twice is refused (400)', (await call('POST', `/orders/${orderId}/pay`, { token: customer, body: { card: GOOD_CARD } })).status === 400);

  const beanie = await find('beanie');
  r = await call('POST', '/orders', { token: customer, body: { items: [{ productId: beanie._id, quantity: 1 }], shippingAddress: ADDRESS } });
  check('sold-out product cannot be ordered (409)', r.status === 409);

  section('Reviews');
  r = await call('POST', `/products/${candle._id}/reviews`, { token: customer, body: { rating: 5, comment: 'Smells great' } });
  check('customer can review (200/201)', r.status === 200 || r.status === 201, JSON.stringify(r.data));
  const rated = (await call('GET', `/products/${candle._id}`)).data;
  check('average rating updated', rated.numReviews === 1 && rated.avgRating === 5);
  check('vendor cannot review (403)', (await call('POST', `/products/${candle._id}/reviews`, { token: vendor1, body: { rating: 5 } })).status === 403);
  check('rating 9 is refused (400)', (await call('POST', `/products/${candle._id}/reviews`, { token: customer, body: { rating: 9 } })).status === 400);

  section('Fulfilment and dashboards');
  const vOrders = (await call('GET', '/orders/vendor', { token: vendor1 })).data;
  check('vendor sees the new order', Array.isArray(vOrders) && vOrders.some((o) => o._id === orderId));
  check('another vendor cannot ship it (403)', (await call('PATCH', `/orders/${orderId}/items/${itemId}/status`, { token: vendor2, body: { status: 'shipped' } })).status === 403);
  check('cannot skip straight to delivered (400)', (await call('PATCH', `/orders/${orderId}/items/${itemId}/status`, { token: vendor1, body: { status: 'delivered' } })).status === 400);
  check('vendor marks it shipped', (await call('PATCH', `/orders/${orderId}/items/${itemId}/status`, { token: vendor1, body: { status: 'shipped' } })).status === 200);
  check('vendor marks it delivered', (await call('PATCH', `/orders/${orderId}/items/${itemId}/status`, { token: vendor1, body: { status: 'delivered' } })).status === 200);
  const vs = (await call('GET', '/vendor/stats', { token: vendor1 })).data;
  check('vendor dashboard has sales', vs?.totals?.revenue > 0 && vs.products.length === 5);
  const as = (await call('GET', '/admin/stats', { token: admin })).data;
  check('admin report has sales and 1 pending vendor', as?.orders?.paid >= 5 && as.vendors.pending === 1);

  section('Vendor approval hides and blocks products');
  const approved = (await call('GET', '/admin/vendors?status=approved', { token: admin })).data;
  const green = approved.find((v) => v.storeName === 'Green Table');
  const olive = await find('extra virgin');
  check('found the Green Table vendor', !!green && !!olive);
  check('admin can reject a vendor', (await call('PATCH', `/admin/vendors/${green._id}/status`, { token: admin, body: { status: 'rejected' } })).status === 200);
  check('their products disappear from the shop', (await call('GET', '/products?category=food')).data.total === 0);
  check('their product page is gone (404)', (await call('GET', `/products/${olive._id}`)).status === 404);
  r = await call('POST', '/orders', { token: customer, body: { items: [{ productId: olive._id, quantity: 1 }], shippingAddress: ADDRESS } });
  check('their products cannot be ordered (400)', r.status === 400);
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
