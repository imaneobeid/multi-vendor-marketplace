const User = require('../models/User');

// The list of approved vendors is needed on almost every request (catalog, product page,
// checkout). It changes rarely, so it is kept in memory for 30 seconds, and cleared
// straight away whenever an admin changes a vendor's status.
const TTL_MS = 30 * 1000;
let cache = null;

async function load() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const ids = await User.distinct('_id', { role: 'vendor', vendorStatus: 'approved' });
  cache = { at: Date.now(), ids, set: new Set(ids.map(String)) };
  return cache;
}

exports.approvedVendorIds = async () => (await load()).ids;
exports.isApprovedVendor = async (id) => !!id && (await load()).set.has(String(id));
exports.clearApprovedVendorCache = () => {
  cache = null;
};
