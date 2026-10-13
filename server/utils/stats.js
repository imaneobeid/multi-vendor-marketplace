// Helpers for dashboard numbers
const TZ = 'Asia/Beirut'; // days are cut at midnight in this timezone

exports.TZ = TZ;
exports.round2 = (n) => Math.round((n || 0) * 100) / 100;

const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }); // "2026-10-13"

// The last n day keys, oldest first
exports.lastDays = (n) => {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = dayKey(Date.now() - i * 86400000);
    if (!keys.includes(k)) keys.push(k);
  }
  return keys;
};

// Turn [{_id:'2026-10-13', revenue: 40}] into one row per day, with 0 for quiet days
exports.fillDays = (rows, n) => {
  const byDay = new Map(rows.map((r) => [r._id, r.revenue]));
  return exports.lastDays(n).map((date) => ({ date, revenue: exports.round2(byDay.get(date) || 0) }));
};
