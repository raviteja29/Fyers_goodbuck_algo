import React, { useState, useEffect } from 'react';
import { apiService, AuthStatus } from '../services/api';
import type { UserProfile } from '../types/market';
import { LogIn, LogOut, User, CheckCircle } from 'lucide-react';

interface FyersLoginProps {
  onAuthChange: (authenticated: boolean) => void;
}

export const FyersLogin: React.FC<FyersLoginProps> = ({ onAuthChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastStatus, setLastStatus] = useState<AuthStatus | null>(null);
  const [lastPing, setLastPing] = useState<any>(null);
  const [debugSession, setDebugSession] = useState<any>(null);

  useEffect(() => {
    console.log('[FyersLogin] Mount. API_BASE:', import.meta.env.VITE_API_URL);
    checkAuthStatus();
    // Check URL params for auth callback
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const authError = params.get('error');
    if (authStatus) {
      console.log('[FyersLogin] URL auth param:', authStatus);
    }
    if (authStatus === 'success') {
      setError(null);
      checkAuthStatus();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'failed') {
      setError(authError || 'Authentication failed');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      console.log('[FyersLogin] Checking auth status...');
      const status: AuthStatus = await apiService.checkAuthStatus();
      console.log('[FyersLogin] Auth status response:', status);
      setLastStatus(status);
      setIsAuthenticated(status.authenticated);
      setProfile(status.profile ?? null);
      onAuthChange(status.authenticated);
      if (!status.authenticated && status.error) {
        setError(status.error);
      }
    } catch (err: any) {
      console.error('[FyersLogin] Auth status error:', err);
      setError(err.message);
      setIsAuthenticated(false);
      onAuthChange(false);
    } finally {
      setLoading(false);
    }
  };

  const runPing = async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://127.0.0.1:3002/api') + '/auth/ping', { credentials: 'include' });
      const json = await res.json();
      setLastPing(json);
      console.log('[FyersLogin] Ping:', json);
    } catch (e: any) {
      setLastPing({ error: e.message });
    }
  };

  const fetchDebugSession = async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://127.0.0.1:3002/api') + '/auth/debug/session', { credentials: 'include' });
      const json = await res.json();
      setDebugSession(json);
      console.log('[FyersLogin] Debug session:', json);
    } catch (e: any) {
      setDebugSession({ error: e.message });
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      console.log('[FyersLogin] Fetching auth URL...');
      const authUrl = await apiService.getAuthUrl();
      console.log('[FyersLogin] Redirecting to auth URL:', authUrl);
      // Open auth URL in same window
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('[FyersLogin] Login error:', err);
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      setError(null);
      console.log('[FyersLogin] Logging out...');
      await apiService.logout();
      setIsAuthenticated(false);
      setProfile(null);
      onAuthChange(false);
    } catch (err: any) {
      console.error('[FyersLogin] Logout error:', err);
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

      <div className="mb-3 text-xs text-slate-500">API: {import.meta.env.VITE_API_URL}</div>
      <div className="mb-2 text-[10px] text-slate-500">document.cookie: {document.cookie || '(empty)'}</div>
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
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-slate-400" />
            <div>
              <div className="font-semibold">Not Connected</div>
              <div className="text-sm text-slate-400">Login to Fyers to fetch live data</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={checkAuthStatus}
              className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors text-xs"
            >Refresh</button>
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          </div>
        </div>
      )}

      {/* Debug / diagnostics */}
      <div className="mt-4">
        <button
          onClick={() => setDebugOpen(o => !o)}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >{debugOpen ? 'Hide' : 'Show'} Auth Diagnostics</button>
        {debugOpen && (
          <div className="mt-3 space-y-3 text-xs bg-slate-900/60 p-3 rounded border border-slate-700">
            <div className="flex flex-wrap gap-2">
              <button onClick={checkAuthStatus} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">Status</button>
              <button onClick={runPing} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">Ping</button>
              <button onClick={fetchDebugSession} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">Debug Session</button>
            </div>
            <div>
              <div className="font-semibold mb-1">Last Status:</div>
              <pre className="whitespace-pre-wrap break-all bg-slate-800 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(lastStatus, null, 2) || '—'}</pre>
            </div>
            <div>
              <div className="font-semibold mb-1">Last Ping:</div>
              <pre className="whitespace-pre-wrap break-all bg-slate-800 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(lastPing, null, 2) || '—'}</pre>
            </div>
            <div>
              <div className="font-semibold mb-1">Debug Session:</div>
              <pre className="whitespace-pre-wrap break-all bg-slate-800 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(debugSession, null, 2) || '—'}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};