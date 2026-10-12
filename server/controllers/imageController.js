const { isValidObjectId } = require('mongoose');
const Image = require('../models/Image');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/images/:id  (public)
exports.getImage = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).end();
  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).end();
  res.set('Content-Type', img.contentType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin'); // lets the Next.js site display it
  res.send(img.data);
});
