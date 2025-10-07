const fyersConfig = {
  appId: process.env.FYERS_APP_ID,
  secretKey: process.env.FYERS_SECRET_KEY,
  redirectUrl: process.env.FYERS_REDIRECT_URL || 'http://localhost:3000/auth/callback',
  baseUrl: 'https://api.fyers.in',
  apiVersion: 'v2',
  
  // Trading settings
  paperTrading: process.env.PAPER_TRADING === 'true',
  
  // Rate limiting settings
  requestsPerSecond: 10,
  
  // Data settings
  defaultTimeframe: '1D',
  maxHistoryDays: 365,
  
  // Option chain settings
  optionChainDepth: 10, // Number of strikes to fetch on each side
  
  // Risk management
  maxPositionSize: 100000, // Maximum position size in INR
  maxDailyLoss: 50000, // Maximum daily loss in INR
};

module.exports = fyersConfig;