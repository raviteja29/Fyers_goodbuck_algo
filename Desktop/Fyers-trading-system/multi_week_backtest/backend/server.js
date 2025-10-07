const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler, rateLimitMiddleware } = require('./middleware/auth');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const optionsRoutes = require('./routes/options');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimitMiddleware(
  parseInt(process.env.MAX_REQUESTS_PER_WINDOW) || 100,
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000
));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/options', optionsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Fyers Trading System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fyers Trading System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      options: '/api/options'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});