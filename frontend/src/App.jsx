import React, { useState } from 'react';
import StockTable from './StockTable';
import './index.css';

function App() {
  const [pollTime, setPollTime] = useState('');

  const handleApplyPollTime = async () => {
    try {
      const url = new URL('http://localhost:8080/api/stocks/update-poll-time');
      if (pollTime) {
        url.searchParams.append('pollTime', pollTime);
      }
      await fetch(url);
      console.log(`Poll time applied: ${pollTime || 'default'} seconds`);
    } catch (err) {
      console.error("Failed to apply poll time:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-400">NSE Live Tracker</h1>
          <p className="text-gray-400 mt-1">Real-time market data feed</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
            <input
              type="number"
              value={pollTime}
              onChange={(e) => setPollTime(e.target.value)}
              placeholder="Poll Time (sec)"
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-32 placeholder:text-gray-600"
            />
            <button
              onClick={handleApplyPollTime}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded transition-colors duration-200"
            >
              Apply
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-green-500 font-medium">Market Open</span>
          </div>
        </div>
      </header>

      <main>
        <StockTable />
      </main>
    </div>
  );
}

export default App;
