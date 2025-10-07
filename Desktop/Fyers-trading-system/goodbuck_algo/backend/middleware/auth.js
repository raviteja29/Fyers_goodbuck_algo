const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        message: 'No token provided, authorization denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        message: 'Token is not valid, user not found' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated' 
      });
    }

    // Add user info to request
    req.userId = decoded.userId;
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token is not valid' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token has expired' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error in authentication' 
    });
  }
};

// Middleware to check if user has valid Fyers credentials
const fyersAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'User authentication required first' 
      });
    }

    // Check if user has valid Fyers credentials
    if (!req.user.isFyersTokenValid()) {
      return res.status(401).json({ 
        message: 'Fyers authentication required. Please connect your Fyers account.' 
      });
    }

    next();
  } catch (error) {
    console.error('Fyers auth middleware error:', error);
    res.status(500).json({ 
      message: 'Server error in Fyers authentication' 
    });
  }
};

// Middleware to check if user is admin (for future use)
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'User authentication required first' 
      });
    }

    // Check if user has admin role (you can add this field to User model)
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'Admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ 
      message: 'Server error in admin authentication' 
    });
  }
};

// Rate limiting middleware for API calls
const rateLimitMiddleware = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.userId || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old requests
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    } else {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequests.push(now);
    next();
  };
};

// Error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      message: 'Validation Error',
      errors
    });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      message: `${field} already exists`
    });
  }

  // MongoDB cast error
  if (error.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format'
    });
  }

  // Default error
  res.status(500).json({
    message: 'Internal server error'
  });
};

module.exports = {
  auth,
  fyersAuth,
  adminAuth,
  rateLimitMiddleware,
  errorHandler
};