require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany(), Category.deleteMany(), Product.deleteMany()]);

  await User.create({ name: 'Admin', email: 'admin@market.test', password: 'admin123', role: 'admin' });
  await User.create({ name: 'Customer', email: 'customer@market.test', password: 'customer123' });
  const vendor = await User.create({
    name: 'Vendor One', email: 'vendor@market.test', password: 'vendor123',
    role: 'vendor', storeName: 'Local Crafts', vendorStatus: 'approved',
  });

  const cats = await Category.insertMany([
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Home & Decor', slug: 'home-decor' },
    { name: 'Food', slug: 'food' },
  ]);

  await Product.insertMany([
    { vendor: vendor._id, category: cats[0]._id, name: 'Handmade Scarf', description: 'Soft wool scarf.', price: 25, stock: 20, images: [] },
    { vendor: vendor._id, category: cats[1]._id, name: 'Ceramic Vase', description: 'Hand-painted vase.', price: 40, stock: 8, images: [] },
    { vendor: vendor._id, category: cats[2]._id, name: 'Local Honey Jar', description: 'Raw organic honey.', price: 12, stock: 50, images: [] },
  ]);

  console.log('Seeded: admin / customer / vendor accounts, 3 categories, 3 products');
  process.exit(0);
})();
