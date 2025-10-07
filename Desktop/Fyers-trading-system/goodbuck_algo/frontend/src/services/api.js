import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR') {
      console.error('Network error - please check your connection');
    }
    
    return Promise.reject(error);
  }
);

// Auth API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateTradingSettings: (settings) => api.put('/auth/trading-settings', settings),
  
  // Fyers integration
  getFyersAuthUrl: () => api.get('/auth/fyers/auth-url'),
  fyersCallback: (authCode) => api.post('/auth/fyers/callback', { authCode }),
  disconnectFyers: () => api.delete('/auth/fyers/disconnect')
};

// Options API methods
export const optionsAPI = {
  // Option chain
  getOptionChain: (underlying, expiry, params = {}) => 
    api.get(`/options/chain/${underlying}/${expiry}`, { params }),
  
  // Historical data
  getHistoricalData: (symbol, fromTime, toTime, interval = '1day') =>
    api.get(`/options/historical/${symbol}`, {
      params: { fromTime, toTime, interval }
    }),
  
  // Live data
  getLiveData: (symbol) => api.get(`/options/live/${symbol}`),
  
  // Fetch and store data
  fetchOptionData: (underlying, expiry, strikes) =>
    api.post(`/options/fetch/${underlying}/${expiry}`, { strikes }),
  
  // Get available expiries
  getExpiries: (underlying) => api.get(`/options/expiries/${underlying}`),
  
  // Get available strikes
  getStrikes: (underlying, expiry) => api.get(`/options/strikes/${underlying}/${expiry}`)
};

// Trading API methods (for future implementation)
export const tradingAPI = {
  getPositions: () => api.get('/trading/positions'),
  getOrders: () => api.get('/trading/orders'),
  placeOrder: (orderData) => api.post('/trading/orders', orderData),
  modifyOrder: (orderId, orderData) => api.put(`/trading/orders/${orderId}`, orderData),
  cancelOrder: (orderId) => api.delete(`/trading/orders/${orderId}`),
  getBalance: () => api.get('/trading/balance')
};

// Backtesting API methods (for future implementation)
export const backtestAPI = {
  createBacktest: (backtestData) => api.post('/backtest', backtestData),
  getBacktests: () => api.get('/backtest'),
  getBacktest: (backtestId) => api.get(`/backtest/${backtestId}`),
  deleteBacktest: (backtestId) => api.delete(`/backtest/${backtestId}`),
  getBacktestResults: (backtestId) => api.get(`/backtest/${backtestId}/results`)
};

// Market data API methods
export const marketAPI = {
  getMarketStatus: () => api.get('/market/status'),
  getIndices: () => api.get('/market/indices'),
  getSymbols: (query) => api.get('/market/symbols', { params: { q: query } }),
  getQuote: (symbol) => api.get(`/market/quote/${symbol}`)
};

// Utility functions
export const apiUtils = {
  // Format date for API calls
  formatDate: (date) => {
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  },
  
  // Parse API error message
  parseError: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },
  
  // Check if API is available
  healthCheck: () => api.get('/health'),
  
  // Download data as CSV
  downloadCSV: async (data, filename) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Helper function to convert JSON to CSV
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
};

// WebSocket connection for real-time data
export class WebSocketService {
  constructor(url) {
    this.url = url || (process.env.REACT_APP_WS_URL || 'ws://localhost:5000');
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Authenticate if token available
        const token = localStorage.getItem('token');
        if (token) {
          this.send({ type: 'auth', token });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.handleReconnect();
    }
  }

  handleMessage(data) {
    const { type, symbol, payload } = data;
    
    if (this.subscribers.has(symbol)) {
      this.subscribers.get(symbol).forEach(callback => {
        callback(type, payload);
      });
    }
  }

  subscribe(symbol, callback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol).add(callback);
    
    // Send subscription message
    this.send({
      type: 'subscribe',
      symbol: symbol
    });
  }

  unsubscribe(symbol, callback) {
    if (this.subscribers.has(symbol)) {
      this.subscribers.get(symbol).delete(callback);
      
      if (this.subscribers.get(symbol).size === 0) {
        this.subscribers.delete(symbol);
        
        // Send unsubscription message
        this.send({
          type: 'unsubscribe',
          symbol: symbol
        });
      }
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
  }
}

export default api;