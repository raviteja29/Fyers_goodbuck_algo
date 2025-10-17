import React, { useState } from 'react';
import NiftyFibStrategy from './components/NiftyFibStrategy';
import { FyersLogin } from './components/FyersLogin';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 py-8 space-y-6 max-w-7xl mx-auto">
      {/* Authentication Panel */}
      <FyersLogin onAuthChange={setIsAuthenticated} />

      {/* Strategy / Data Visualizations */}
      <NiftyFibStrategy isAuthenticated={isAuthenticated} />

      {/* Host mismatch helper */}
      {window.location.hostname === 'localhost' && (
        <div className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700 p-3 rounded">
          You are viewing via localhost. For session cookies set on 127.0.0.1 to work, open the app at http://127.0.0.1:5173 (or restart the flow entirely on one hostname only).
        </div>
      )}
    </div>
  );
}

export default App