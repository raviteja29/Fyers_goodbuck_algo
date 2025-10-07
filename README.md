# Fyers Multi-Week Backtest Trading System

A comprehensive full-stack trading system for multi-week option backtesting using the Fyers API. This system allows traders to analyze historical option data, perform backtesting strategies, and manage live trading through an intuitive web interface.

## 🚀 Features

### Backend Features
- **Authentication & Authorization**: JWT-based user authentication with secure password hashing
- **Fyers API Integration**: Complete OAuth flow integration with Fyers trading platform
- **Option Data Management**: Store and retrieve historical option chain data
- **Real-time Data**: Live option quotes and market data streaming
- **RESTful API**: Well-structured API endpoints for all trading operations
- **Database Integration**: MongoDB with Mongoose for data persistence
- **Rate Limiting**: API rate limiting to prevent abuse
- **Error Handling**: Comprehensive error handling and logging

### Frontend Features
- **Modern React Interface**: Responsive web application built with React 18
- **Interactive Charts**: Real-time option price charts with multiple timeframes
- **Option Chain Visualization**: Complete option chain display with Greeks
- **User Dashboard**: Comprehensive trading dashboard with account information
- **Live Data Streaming**: Real-time market data updates
- **Mobile Responsive**: Optimized for desktop and mobile devices

### Trading Features
- **Paper Trading**: Safe testing environment before live trading
- **Multi-week Backtesting**: Analyze strategies over extended periods
- **Option Greeks**: Delta, Gamma, Theta, Vega calculations and display
- **Risk Management**: Position sizing and loss limits
- **Multiple Underlyings**: Support for NIFTY, BANKNIFTY, FINNIFTY, etc.

## 📁 Project Structure

```
multi_week_backtest/
├── backend/                    # Node.js backend application
│   ├── config/                # Configuration files
│   │   ├── db.js              # MongoDB connection
│   │   └── fyers.js           # Fyers API configuration
│   ├── models/                # Database models
│   │   ├── User.js            # User model with authentication
│   │   └── OptionData.js      # Option data model
│   ├── routes/                # API route handlers
│   │   ├── auth.js            # Authentication routes
│   │   └── options.js         # Option data routes
│   ├── middleware/            # Express middleware
│   │   └── auth.js            # Authentication middleware
│   ├── services/              # Business logic services
│   │   └── fyersService.js    # Fyers API integration
│   ├── .env                   # Environment variables
│   ├── server.js              # Express server entry point
│   └── package.json           # Backend dependencies
└── frontend/                  # React frontend application
    ├── src/
    │   ├── components/        # React components
    │   │   ├── Login.js       # Authentication component
    │   │   └── OptionChart.js # Option charting component
    │   ├── services/          # API service layer
    │   │   └── api.js         # Axios API configuration
    │   ├── App.js             # Main application component
    │   └── index.js           # React entry point
    └── package.json           # Frontend dependencies
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Fyers API credentials (App ID, Secret Key)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd multi_week_backtest/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy the `.env` file and update with your credentials:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/fyers-trading-system
   JWT_SECRET=your_super_secret_jwt_key_here
   FYERS_APP_ID=your_fyers_app_id
   FYERS_SECRET_KEY=your_fyers_secret_key
   FYERS_REDIRECT_URL=http://localhost:3000/auth/callback
   PAPER_TRADING=true
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Start the backend server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd multi_week_backtest/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔧 Configuration

### Fyers API Setup

1. **Create Fyers Developer Account**
   - Visit [Fyers Developer Portal](https://api.fyers.in/)
   - Create an account and verify your email
   - Create a new app to get API credentials

2. **Configure OAuth Redirect URL**
   - Set redirect URL to: `http://localhost:3000/auth/callback`
   - For production, update with your domain

3. **Update Environment Variables**
   - Add your `FYERS_APP_ID` and `FYERS_SECRET_KEY` to `.env`

### Database Configuration

The system uses MongoDB for data storage. Default configuration:
- Database name: `fyers-trading-system`
- Collections: `users`, `optiondata`

You can modify the connection string in the `.env` file.

## 📊 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/trading-settings` | Update trading settings |
| GET | `/api/auth/fyers/auth-url` | Get Fyers OAuth URL |
| POST | `/api/auth/fyers/callback` | Handle Fyers OAuth callback |

### Option Data Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/options/chain/:underlying/:expiry` | Get option chain |
| GET | `/api/options/historical/:symbol` | Get historical data |
| GET | `/api/options/live/:symbol` | Get live quotes |
| POST | `/api/options/fetch/:underlying/:expiry` | Fetch and store data |
| GET | `/api/options/expiries/:underlying` | Get available expiries |
| GET | `/api/options/strikes/:underlying/:expiry` | Get available strikes |

## 🎯 Usage Examples

### Fetching Option Chain
```javascript
// Get NIFTY option chain for specific expiry
const response = await optionsAPI.getOptionChain('NIFTY', '2024-10-31');
console.log(response.data.optionChain);
```

### Getting Historical Data
```javascript
// Get 30 days of historical data for an option
const fromTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const toTime = new Date();
const response = await optionsAPI.getHistoricalData(
  'NIFTY2410318000CE', 
  fromTime, 
  toTime, 
  '1day'
);
```

### User Authentication
```javascript
// Login user
const response = await authAPI.login({
  email: 'user@example.com',
  password: 'password123'
});

// Access token for subsequent requests
const token = response.data.token;
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: Prevent API abuse
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Secure error messages

## 📈 Trading Features

### Paper Trading Mode
- Safe testing environment
- No real money risk
- Full feature access
- Performance tracking

### Risk Management
- Position size limits
- Daily loss limits
- Auto-stop mechanisms
- Risk-reward calculations

### Backtesting Capabilities
- Multi-week analysis
- Strategy optimization
- Performance metrics
- Historical simulation

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Production Environment Variables
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://your-cluster/fyers-trading-system
JWT_SECRET=your-production-jwt-secret
FYERS_REDIRECT_URL=https://yourdomain.com/auth/callback
FRONTEND_URL=https://yourdomain.com
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is for educational and research purposes only. Trading in options involves substantial risk and is not suitable for all investors. Past performance does not guarantee future results. Always consult with a qualified financial advisor before making investment decisions.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@your-domain.com
- Documentation: [Wiki](https://github.com/your-repo/wiki)

## 🔮 Roadmap

- [ ] Advanced backtesting strategies
- [ ] Machine learning price predictions
- [ ] Mobile app development
- [ ] Multi-broker support
- [ ] Advanced risk analytics
- [ ] Social trading features
- [ ] Algorithmic trading bots
- [ ] Real-time alerts and notifications

---

**Built with ❤️ for the trading community**