// Stops "NoSQL injection": requests that try to smuggle MongoDB operators ($gt, $ne, ...)
// into queries, and query strings with unexpected arrays or objects.
const hasOperator = (value) => {
  if (Array.isArray(value)) return value.some(hasOperator);
  if (value && typeof value === 'object') {
    return Object.keys(value).some((k) => k.startsWith('$') || k.includes('.') || hasOperator(value[k]));
  }
  return false;
};

module.exports = (req, res, next) => {
  for (const value of Object.values(req.query)) {
    if (typeof value !== 'string') return res.status(400).json({ message: 'Invalid query parameters' });
  }
  if (hasOperator(req.body)) return res.status(400).json({ message: 'Invalid input' });
  next();
};
