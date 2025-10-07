const mongoose = require('mongoose');

const optionDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    index: true
  },
  underlying: {
    type: String,
    required: true,
    index: true
  },
  strike: {
    type: Number,
    required: true
  },
  optionType: {
    type: String,
    enum: ['CE', 'PE'],
    required: true
  },
  expiry: {
    type: Date,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  
  // Price data
  ltp: {
    type: Number,
    required: true
  },
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
  
  // Option Greeks
  delta: Number,
  gamma: Number,
  theta: Number,
  vega: Number,
  impliedVolatility: Number,
  
  // Bid/Ask data
  bid: Number,
  ask: Number,
  bidQty: Number,
  askQty: Number,
  
  // Open Interest
  oi: Number,
  oiChange: Number,
  
  // Additional fields
  timeValue: Number,
  intrinsicValue: Number,
  
  // Metadata
  source: {
    type: String,
    default: 'fyers'
  },
  dataQuality: {
    type: String,
    enum: ['realtime', 'delayed', 'historical'],
    default: 'realtime'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
optionDataSchema.index({ symbol: 1, timestamp: -1 });
optionDataSchema.index({ underlying: 1, expiry: 1, timestamp: -1 });
optionDataSchema.index({ underlying: 1, strike: 1, optionType: 1, expiry: 1 });

// Static method to get option chain
optionDataSchema.statics.getOptionChain = function(underlying, expiry, fromTime, toTime) {
  return this.find({
    underlying,
    expiry,
    timestamp: {
      $gte: fromTime,
      $lte: toTime
    }
  }).sort({ strike: 1, timestamp: -1 });
};

// Static method to get historical data for a specific option
optionDataSchema.statics.getHistoricalData = function(symbol, fromTime, toTime) {
  return this.find({
    symbol,
    timestamp: {
      $gte: fromTime,
      $lte: toTime
    }
  }).sort({ timestamp: 1 });
};

// Static method to get latest option data
optionDataSchema.statics.getLatestOptionData = function(underlying, expiry) {
  return this.aggregate([
    {
      $match: {
        underlying,
        expiry
      }
    },
    {
      $sort: { timestamp: -1 }
    },
    {
      $group: {
        _id: { symbol: '$symbol', strike: '$strike', optionType: '$optionType' },
        latestData: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestData' }
    },
    {
      $sort: { strike: 1, optionType: 1 }
    }
  ]);
};

module.exports = mongoose.model('OptionData', optionDataSchema);