import React, { createContext, useState, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import OptionChart from './components/OptionChart';
import './App.css';

// Auth Context
export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Dashboard Component (placeholder)
const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedUnderlying, setSelectedUnderlying] = useState('NIFTY');
  const [selectedExpiry, setSelectedExpiry] = useState('');

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Fyers Trading System</h1>
          <span className="user-info">Welcome, {user?.username}</span>
        </div>
        <div className="header-right">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="sidebar">
          <div className="symbol-selector">
            <h3>Symbol Selection</h3>
            
            <div className="form-group">
              <label>Underlying:</label>
              <select 
                value={selectedUnderlying} 
                onChange={(e) => setSelectedUnderlying(e.target.value)}
              >
                <option value="NIFTY">NIFTY</option>
                <option value="BANKNIFTY">BANKNIFTY</option>
                <option value="FINNIFTY">FINNIFTY</option>
                <option value="SENSEX">SENSEX</option>
                <option value="BANKEX">BANKEX</option>
              </select>
            </div>

            <div className="form-group">
              <label>Expiry:</label>
              <input
                type="date"
                value={selectedExpiry}
                onChange={(e) => setSelectedExpiry(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Option Symbol:</label>
              <input
                type="text"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                placeholder="e.g., NIFTY2410518000CE"
              />
            </div>
          </div>

          <div className="trading-info">
            <h3>Account Info</h3>
            <div className="info-item">
              <span>Fyers Connected:</span>
              <span className={user?.fyersConnected ? 'connected' : 'disconnected'}>
                {user?.fyersConnected ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="info-item">
              <span>Paper Trading:</span>
              <span>{user?.tradingSettings?.paperTrading ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>

        <div className="main-content">
          <OptionChart
            symbol={selectedSymbol}
            underlying={selectedUnderlying}
            expiry={selectedExpiry}
            onDataUpdate={(data) => console.log('Chart data updated:', data)}
          />
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;