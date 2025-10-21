import React, { useState } from 'react';
import { FyersLogin } from './components/FyersLogin';
import WeeklyOptionAnalyzer from './components/WeeklyOptionAnalyzer';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 space-y-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Authentication Panel */}
        <FyersLogin onAuthChange={setIsAuthenticated} />

        {/* Weekly Option Analyzer - Main Trading Interface */}
        <WeeklyOptionAnalyzer isAuthenticated={isAuthenticated} />

        {/* Host mismatch helper */}
        {window.location.hostname === 'localhost' && (
          <div className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700 p-3 rounded mt-4">
            You are viewing via localhost. For session cookies set on 127.0.0.1 to work, open the app at http://127.0.0.1:5173 (or restart the flow entirely on one hostname only).
          </div>
        )}
      </div>
    </div>
  );
}

export default App