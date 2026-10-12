const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');

// Never send the password hash back
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  storeName: u.storeName,
  vendorStatus: u.role === 'vendor' ? u.vendorStatus : undefined,
});

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, storeName, storeDescription } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  // Admin accounts can NEVER be created through this route (they come from the seed)
  if (role && !['customer', 'vendor'].includes(role)) {
    return res.status(400).json({ message: 'Role must be customer or vendor' });
  }
  if (role === 'vendor' && !storeName) {
    return res.status(400).json({ message: 'Store name is required for vendors' });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'customer',
    storeName: role === 'vendor' ? storeName : undefined,
    storeDescription: role === 'vendor' ? storeDescription : undefined,
    // vendorStatus defaults to 'pending' until an admin approves
  });

  res.status(201).json({ token: generateToken(user._id), user: publicUser(user) });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // password is select:false in the model, so ask for it explicitly
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  res.json({ token: generateToken(user._id), user: publicUser(user) });
});

// GET /api/auth/me  (protected)
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});
