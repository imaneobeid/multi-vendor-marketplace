const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// GET /api/categories  (public)
exports.listCategories = asyncHandler(async (req, res) => {
  res.json(await Category.find().sort('name'));
});

// POST /api/categories  (admin)
exports.createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Category name is required' });
  const slug = slugify(name);
  if (await Category.findOne({ slug })) {
    return res.status(409).json({ message: 'Category already exists' });
  }
  res.status(201).json(await Category.create({ name: name.trim(), slug }));
});
