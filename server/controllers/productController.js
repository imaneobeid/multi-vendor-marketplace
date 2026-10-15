const { isValidObjectId } = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Image = require('../models/Image');
const asyncHandler = require('../utils/asyncHandler');
const { approvedVendorIds, isApprovedVendor } = require('../utils/vendors');
const { processImage } = require('../utils/imageProcessing');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const imageIdFromUrl = (url) => url.split('/').pop();

async function saveImages(files = [], ownerId) {
  const processed = await Promise.all(files.map((f) => processImage(f.buffer, f.mimetype)));
  const docs = await Image.insertMany(
    processed.map((p) => ({ data: p.data, contentType: p.contentType, size: p.data.length, owner: ownerId }))
  );
  return docs.map((d) => `/api/images/${d._id}`);
}

async function deleteImagesByUrls(urls = []) {
  const ids = urls.map(imageIdFromUrl).filter(isValidObjectId);
  if (ids.length) await Image.deleteMany({ _id: { $in: ids } });
}

const populateProduct = (q) =>
  q.populate('category', 'name slug').populate('vendor', 'storeName');

// GET /api/products?search=&category=&minPrice=&maxPrice=&sort=&page=&limit=   (public)
exports.listProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, vendor, sort = 'newest' } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

  const filter = {};

  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }

  if (category) {
    // accepts a category id OR a slug
    if (isValidObjectId(category)) filter.category = category;
    else {
      const cat = await Category.findOne({ slug: category.toLowerCase() });
      if (!cat) return res.json({ products: [], page, pages: 0, total: 0 });
      filter.category = cat._id;
    }
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice && !isNaN(minPrice)) filter.price.$gte = Number(minPrice);
    if (maxPrice && !isNaN(maxPrice)) filter.price.$lte = Number(maxPrice);
  }

  // Only products from approved vendors are shown in the shop
  const approvedIds = await approvedVendorIds();
  filter.vendor = { $in: approvedIds };
  if (vendor && isValidObjectId(vendor)) {
    filter.vendor = approvedIds.some((id) => id.equals(vendor)) ? vendor : { $in: [] };
  }

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { avgRating: -1, numReviews: -1 },
  };

  const [products, total] = await Promise.all([
    populateProduct(Product.find(filter))
      .sort(sortMap[sort] || sortMap.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ products, page, pages: Math.ceil(total / limit), total });
});

// GET /api/products/:id   (public)
exports.getProduct = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const product = await populateProduct(Product.findById(req.params.id));
  if (!product || !(await isApprovedVendor(product.vendor && product.vendor._id))) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json(product);
});

// GET /api/products/mine   (vendor)
exports.myProducts = asyncHandler(async (req, res) => {
  const products = await populateProduct(Product.find({ vendor: req.user._id })).sort('-createdAt');
  res.json(products);
});

// POST /api/products   (approved vendor, multipart/form-data, field "images")
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, stock, category } = req.body;

  if (!name || !description || price === undefined || !category) {
    return res.status(400).json({ message: 'Name, description, price and category are required' });
  }
  const priceNum = Number(price);
  const stockNum = stock === undefined || stock === '' ? 0 : Number(stock);
  if (isNaN(priceNum) || priceNum < 0) return res.status(400).json({ message: 'Invalid price' });
  if (!Number.isInteger(stockNum) || stockNum < 0) return res.status(400).json({ message: 'Stock must be a whole number, 0 or more' });
  if (!isValidObjectId(category) || !(await Category.exists({ _id: category }))) {
    return res.status(400).json({ message: 'Category not found' });
  }

  const images = await saveImages(req.files, req.user._id);
  const product = await Product.create({
    vendor: req.user._id,
    category,
    name: name.trim(),
    description: description.trim(),
    price: priceNum,
    stock: stockNum,
    images,
  });
  res.status(201).json(await populateProduct(Product.findById(product._id)));
});

// PUT /api/products/:id   (owner vendor or admin)
exports.updateProduct = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  if (req.user.role !== 'admin' && !product.vendor.equals(req.user._id)) {
    return res.status(403).json({ message: 'This is not your product' });
  }

  const { name, description, price, stock, category } = req.body;
  if (name !== undefined) product.name = name.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) {
    const p = Number(price);
    if (isNaN(p) || p < 0) return res.status(400).json({ message: 'Invalid price' });
    product.price = p;
  }
  if (stock !== undefined) {
    const s = Number(stock);
    if (!Number.isInteger(s) || s < 0) return res.status(400).json({ message: 'Stock must be a whole number, 0 or more' });
    product.stock = s;
  }
  if (category !== undefined) {
    if (!isValidObjectId(category) || !(await Category.exists({ _id: category }))) {
      return res.status(400).json({ message: 'Category not found' });
    }
    product.category = category;
  }

  // Remove images: send "removeImages" as a JSON array of image URLs
  if (req.body.removeImages) {
    let toRemove = req.body.removeImages;
    if (typeof toRemove === 'string') {
      try { toRemove = JSON.parse(toRemove); } catch { toRemove = [toRemove]; }
    }
    toRemove = [].concat(toRemove).filter((u) => product.images.includes(u));
    product.images = product.images.filter((u) => !toRemove.includes(u));
    await deleteImagesByUrls(toRemove);
  }

  // Add new images
  if (req.files && req.files.length) {
    if (product.images.length + req.files.length > 4) {
      return res.status(400).json({ message: 'A product can have at most 4 images' });
    }
    product.images.push(...(await saveImages(req.files, req.user._id)));
  }

  await product.save();
  res.json(await populateProduct(Product.findById(product._id)));
});

// DELETE /api/products/:id   (owner vendor or admin)
exports.deleteProduct = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  if (req.user.role !== 'admin' && !product.vendor.equals(req.user._id)) {
    return res.status(403).json({ message: 'This is not your product' });
  }
  await deleteImagesByUrls(product.images);
  await product.deleteOne();
  res.json({ message: 'Product deleted' });
});
