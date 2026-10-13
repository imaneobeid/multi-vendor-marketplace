require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth'));             // Day 2
app.use('/api/products', require('./routes/products'));     // Day 3 (+ reviews on Day 5)
app.use('/api/categories', require('./routes/categories')); // Day 3
app.use('/api/images', require('./routes/images'));         // Day 3
app.use('/api/reviews', require('./routes/reviews'));       // Day 5
app.use('/api/orders', require('./routes/orders'));         // Day 6

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 2 MB or smaller' : err.message;
    return res.status(400).json({ message: msg });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
