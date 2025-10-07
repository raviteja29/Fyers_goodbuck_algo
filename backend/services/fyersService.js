const axios = require('axios');
const crypto = require('crypto');
const fyersConfig = require('../config/fyers');
const User = require('../models/User');

class FyersService {
  constructor() {
    this.baseUrl = fyersConfig.baseUrl;
    this.appId = fyersConfig.appId;
    this.secretKey = fyersConfig.secretKey;
    this.redirectUrl = fyersConfig.redirectUrl;
  }

  // Generate authorization URL for OAuth flow
  async getAuthorizationUrl() {
    try {
      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = `${this.baseUrl}/api/v2/generate-authcode?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUrl)}&response_type=code&state=${state}`;
      
      return authUrl;
    } catch (error) {
      console.error('Error generating authorization URL:', error);
      throw new Error('Failed to generate authorization URL');
    }
  }

  // Exchange authorization code for access token
  async getAccessToken(authCode) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/v2/validate-authcode`, {
        grant_type: 'authorization_code',
        appIdHash: this.generateAppIdHash(),
        code: authCode
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.code !== 200) {
        throw new Error(response.data.message || 'Failed to get access token');
      }

      return response.data;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to get access token from Fyers');
    }
  }

  // Generate app ID hash
  generateAppIdHash() {
    return crypto
      .createHash('sha256')
      .update(`${this.appId}:${this.secretKey}`)
      .digest('hex');
  }

  // Get user's Fyers credentials
  async getUserCredentials(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isFyersTokenValid()) {
      throw new Error('Valid Fyers credentials not found');
    }
    return user.fyersCredentials;
  }

  // Make authenticated API call to Fyers
  async makeAuthenticatedRequest(userId, endpoint, method = 'GET', data = null) {
    try {
      const credentials = await this.getUserCredentials(userId);
      
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }

      const response = await axios(config);
      
      if (response.data.code !== 200) {
        throw new Error(response.data.message || 'API request failed');
      }

      return response.data;
    } catch (error) {
      console.error('Fyers API request error:', error);
      throw new Error(`Fyers API error: ${error.message}`);
    }
  }

  // Get live quote for a symbol
  async getLiveQuote(userId, symbol) {
    try {
      const endpoint = `/api/v2/quotes/?symbols=${symbol}`;
      const response = await this.makeAuthenticatedRequest(userId, endpoint);
      return response.d;
    } catch (error) {
      console.error('Error getting live quote:', error);
      throw error;
    }
  }

  // Get historical data
  async getHistoricalData(userId, symbol, resolution, fromDate, toDate) {
    try {
      const endpoint = `/api/v2/data/history?symbol=${symbol}&resolution=${resolution}&date_format=1&range_from=${fromDate}&range_to=${toDate}&cont_flag=1`;
      const response = await this.makeAuthenticatedRequest(userId, endpoint);
      return response.candles;
    } catch (error) {
      console.error('Error getting historical data:', error);
      throw error;
    }
  }

  // Get option chain
  async getOptionChain(userId, symbol, strikeCount = 10, expiryCount = 3) {
    try {
      const endpoint = `/api/v2/optionchain?symbol=${symbol}&strikecount=${strikeCount}&expirycount=${expiryCount}`;
      const response = await this.makeAuthenticatedRequest(userId, endpoint);
      return response.data;
    } catch (error) {
      console.error('Error getting option chain:', error);
      throw error;
    }
  }

  // Fetch and format option chain data for storage
  async fetchOptionChain(userId, underlying, expiry, strikes = null) {
    try {
      // Get the option chain from Fyers
      const optionChain = await this.getOptionChain(userId, underlying);
      
      const formattedOptions = [];
      const timestamp = new Date();

      // Process the option chain data
      if (optionChain && optionChain.optionsChain) {
        for (const expiryData of optionChain.optionsChain) {
          const expiryDate = new Date(expiryData.expiry);
          
          // Filter by expiry if specified
          if (expiry && expiryDate.toDateString() !== expiry.toDateString()) {
            continue;
          }

          for (const strikeData of expiryData.optionsData) {
            const strike = strikeData.strikePrice;
            
            // Filter by strikes if specified
            if (strikes && !strikes.includes(strike)) {
              continue;
            }

            // Process Call option
            if (strikeData.call) {
              const callData = this.formatOptionData(
                strikeData.call,
                underlying,
                strike,
                'CE',
                expiryDate,
                timestamp
              );
              formattedOptions.push(callData);
            }

            // Process Put option
            if (strikeData.put) {
              const putData = this.formatOptionData(
                strikeData.put,
                underlying,
                strike,
                'PE',
                expiryDate,
                timestamp
              );
              formattedOptions.push(putData);
            }
          }
        }
      }

      return formattedOptions;
    } catch (error) {
      console.error('Error fetching option chain:', error);
      throw error;
    }
  }

  // Format option data for database storage
  formatOptionData(optionData, underlying, strike, optionType, expiry, timestamp) {
    return {
      symbol: optionData.symbol || `${underlying}${expiry.getFullYear()}${(expiry.getMonth() + 1).toString().padStart(2, '0')}${expiry.getDate().toString().padStart(2, '0')}${strike}${optionType}`,
      underlying: underlying.toUpperCase(),
      strike: strike,
      optionType: optionType,
      expiry: expiry,
      timestamp: timestamp,
      
      // Price data
      ltp: optionData.ltp || 0,
      open: optionData.open || 0,
      high: optionData.high || 0,
      low: optionData.low || 0,
      close: optionData.close || optionData.ltp || 0,
      volume: optionData.volume || 0,
      
      // Option Greeks
      delta: optionData.delta || 0,
      gamma: optionData.gamma || 0,
      theta: optionData.theta || 0,
      vega: optionData.vega || 0,
      impliedVolatility: optionData.iv || 0,
      
      // Bid/Ask data
      bid: optionData.bid || 0,
      ask: optionData.ask || 0,
      bidQty: optionData.bidQty || 0,
      askQty: optionData.askQty || 0,
      
      // Open Interest
      oi: optionData.oi || 0,
      oiChange: optionData.oiChange || 0,
      
      // Additional calculations
      timeValue: this.calculateTimeValue(optionData.ltp, strike, optionData.underlyingPrice, optionType),
      intrinsicValue: this.calculateIntrinsicValue(strike, optionData.underlyingPrice, optionType),
      
      // Metadata
      source: 'fyers',
      dataQuality: 'realtime'
    };
  }

  // Calculate intrinsic value
  calculateIntrinsicValue(strike, underlyingPrice, optionType) {
    if (optionType === 'CE') {
      return Math.max(0, underlyingPrice - strike);
    } else {
      return Math.max(0, strike - underlyingPrice);
    }
  }

  // Calculate time value
  calculateTimeValue(premium, strike, underlyingPrice, optionType) {
    const intrinsicValue = this.calculateIntrinsicValue(strike, underlyingPrice, optionType);
    return Math.max(0, premium - intrinsicValue);
  }

  // Get profile information
  async getProfile(userId) {
    try {
      const endpoint = '/api/v2/profile';
      const response = await this.makeAuthenticatedRequest(userId, endpoint);
      return response.data;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  // Get account balance
  async getBalance(userId) {
    try {
      const endpoint = '/api/v2/funds';
      const response = await this.makeAuthenticatedRequest(userId, endpoint);
      return response.fund_limit;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Place order (for future implementation)
  async placeOrder(userId, orderData) {
    try {
      const endpoint = '/api/v2/orders';
      const response = await this.makeAuthenticatedRequest(userId, endpoint, 'POST', orderData);
      return response.data;
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  // Get positions
  async getPositions(userId) {
    try {
      const endpoint = '/api/v2/positions';
      const response = await this.makeAuthenticatedRequest(userId, endpoint);
      return response.netPositions;
    } catch (error) {
      console.error('Error getting positions:', error);
      throw error;
    }
  }

  // Get orders
  async getOrders(userId) {
    try {
      const endpoint = '/api/v2/orders';
      const response = await this.makeAuthenticatedRequest(userId, endpoint);
      return response.orderBook;
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  }
}

module.exports = new FyersService();