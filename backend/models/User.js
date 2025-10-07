const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  fyersCredentials: {
    accessToken: String,
    refreshToken: String,
    clientId: String,
    expiresAt: Date
  },
  tradingSettings: {
    maxRiskPerTrade: {
      type: Number,
      default: 10000 // in INR
    },
    paperTrading: {
      type: Boolean,
      default: true
    },
    autoTrade: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if Fyers token is valid
userSchema.methods.isFyersTokenValid = function() {
  return this.fyersCredentials.accessToken && 
         this.fyersCredentials.expiresAt && 
         this.fyersCredentials.expiresAt > new Date();
};

module.exports = mongoose.model('User', userSchema);