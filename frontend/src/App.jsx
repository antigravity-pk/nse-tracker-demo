import React from 'react';
import StockTable from './StockTable';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-400">NSE Live Tracker</h1>
          <p className="text-gray-400 mt-1">Real-time market data feed</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-green-500 font-medium">Market Open</span>
        </div>
      </header>
      
      <main>
        <StockTable />
      </main>
    </div>
  );
}

export default App;
