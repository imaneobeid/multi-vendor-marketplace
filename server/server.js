require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Stop early with a clear message if the setup is incomplete
for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Add it to your .env file (see .env.example).`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 16) {
  console.error('JWT_SECRET is too short. Use a long random string (at least 16 characters).');
  process.exit(1);
}

const app = express();
connectDB();

app.set('trust proxy', 1); // correct client IPs when deployed behind a host's proxy
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // security headers

// CLIENT_URL can list several sites, separated by commas
const origins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));

app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));

const tooMany = { message: 'Too many requests. Please wait a few minutes and try again.' };
const limiter = (limit) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: tooMany });

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Product images are many small requests per page, so they are not rate limited
app.use('/api/images', require('./routes/images'));

app.use('/api/auth/login', limiter(30));    // slows down password guessing
app.use('/api/auth/register', limiter(30));
app.use('/api', limiter(1500));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/vendor', require('./routes/vendor'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 2 MB or smaller' : err.message;
    return res.status(400).json({ message: msg });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large' });
  console.error(err);
  res.status(err.status || 500).json({ message: err.status && err.status < 500 ? err.message : 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
