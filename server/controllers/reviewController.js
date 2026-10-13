const { isValidObjectId } = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/products/:id/reviews   (public)
exports.listReviews = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const reviews = await Review.find({ product: req.params.id }).populate('user', 'name').sort('-createdAt');
  res.json(reviews);
});

// POST /api/products/:id/reviews   (customer). Creates the review, or updates the customer's existing one.
exports.upsertReview = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5' });
  }
  const comment = (req.body.comment || '').trim();
  if (comment.length > 1000) {
    return res.status(400).json({ message: 'Comment must be 1000 characters or fewer' });
  }

  let review = await Review.findOne({ product: product._id, user: req.user._id });
  let status = 200;
  if (review) {
    review.rating = rating;
    review.comment = comment;
    await review.save();
  } else {
    review = await Review.create({ product: product._id, user: req.user._id, rating, comment });
    status = 201;
  }

  await Review.recalculate(product._id); // wait, so the product's average is correct in the next request
  res.status(status).json(await review.populate('user', 'name'));
});

// DELETE /api/reviews/:id   (author or admin)
exports.deleteReview = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Review not found' });
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  if (req.user.role !== 'admin' && !review.user.equals(req.user._id)) {
    return res.status(403).json({ message: 'This is not your review' });
  }
  const productId = review.product;
  await review.deleteOne();
  await Review.recalculate(productId);
  res.json({ message: 'Review deleted' });
});
