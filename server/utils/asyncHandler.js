// Express 4 doesn't catch errors thrown in async handlers.
// Wrap every async controller with this so errors reach the error middleware.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
