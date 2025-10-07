import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { LogIn, LogOut, User, CheckCircle } from 'lucide-react';

interface FyersLoginProps {
  onAuthChange: (authenticated: boolean) => void;
}

export const FyersLogin: React.FC<FyersLoginProps> = ({ onAuthChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
    
    // Check URL params for auth callback
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const authError = params.get('error');
    
    if (authStatus === 'success') {
      setError(null);
      checkAuthStatus();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'failed') {
      setError(authError || 'Authentication failed');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const status = await apiService.checkAuthStatus();
      setIsAuthenticated(status.authenticated);
      setProfile(status.profile);
      onAuthChange(status.authenticated);
      if (!status.authenticated && status.error) {
        setError(status.error);
      }
    } catch (err: any) {
      setError(err.message);
      setIsAuthenticated(false);
      onAuthChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      const authUrl = await apiService.getAuthUrl();
      // Open auth URL in same window
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      setError(null);
      await apiService.logout();
      setIsAuthenticated(false);
      setProfile(null);
      onAuthChange(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2">Checking authentication...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {isAuthenticated ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-semibold text-green-400">Connected to Fyers</div>
              {profile && (
                <div className="text-sm text-slate-400">
                  {profile.name || profile.email_id || 'User'}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-slate-400" />
            <div>
              <div className="font-semibold">Not Connected</div>
              <div className="text-sm text-slate-400">Login to Fyers to fetch live data</div>
            </div>
          </div>
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Login to Fyers
          </button>
        </div>
      )}
    </div>
  );
};