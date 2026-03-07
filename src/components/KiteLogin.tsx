import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface KiteLoginProps {
  onAuthChange?: (authed: boolean) => void;
}

export const KiteLogin: React.FC<KiteLoginProps> = ({ onAuthChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
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
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'failed') {
      setError(authError || 'Authentication failed');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const status = await apiService.request<{ authenticated: boolean }>(`/kite/status`);
      setIsAuthenticated(status.authenticated);
      setError(null);
      if (onAuthChange) onAuthChange(status.authenticated);
    } catch (err: any) {
      setIsAuthenticated(false);
      setError(err.message);
      if (onAuthChange) onAuthChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { url } = await apiService.request<{ url: string }>(`/kite/url`);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    setLoading(true);
    try {
      await apiService.request(`/kite/logout`, { method: 'POST' });
      setIsAuthenticated(false);
      if (onAuthChange) onAuthChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg mb-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-lg mb-1">Kite Login</div>
          {isAuthenticated ? (
            <div className="text-green-400">Connected to Kite</div>
          ) : (
            <div className="text-slate-400">Login to Kite to fetch live data</div>
          )}
        </div>
        <div>
          {isAuthenticated ? (
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white">Logout</button>
          ) : (
            <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white" disabled={loading}>
              {loading ? 'Loading...' : 'Login with Kite'}
            </button>
          )}
        </div>
      </div>
      {error && <div className="mt-2 text-red-400">{error}</div>}
    </div>
  );
};
