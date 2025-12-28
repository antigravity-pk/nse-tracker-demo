import React, { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ArrowUp, ArrowDown, Activity, ChevronUp, ChevronDown, Plus, Minus, Star, Briefcase } from 'lucide-react';
import classNames from 'classnames';

const StockTable = () => {
    const [stocks, setStocks] = useState([]);
    const [filters, setFilters] = useState({
        pChange: '',
        perChange30d: '',
        perChange365d: '',
        industry: '',
        symbol: ''
    });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
    const [watchlist, setWatchlist] = useState(() => {
        const saved = localStorage.getItem('nse_watchlist');
        return saved ? JSON.parse(saved) : [];
    });
    const [portfolio, setPortfolio] = useState([]);
    const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
    const [showPortfolioOnly, setShowPortfolioOnly] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const DUMMY_STOCK = {
        symbol: 'DEMO-NSE',
        companyName: 'Demo NSE Company Limited',
        industry: 'Demo Industry (Backend Offline)',
        price: 1234.56,
        pChange: 1.25,
        perChange30d: 5.67,
        perChange365d: 15.42,
        ffmc: 50000000000,
        dayHigh: 1250,
        dayLow: 1220,
        weekHigh: 1300,
        weekLow: 1100,
        yearHigh: 1500,
        yearLow: 900
    };

    // Store previous prices to determine direction for animation
    const prevPricesRef = useRef({});

    useEffect(() => {
        localStorage.setItem('nse_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    useEffect(() => {
        // Fetch initial portfolio from backend
        fetch('http://localhost:8080/api/stocks/portfolio')
            .then(res => res.json())
            .then(data => setPortfolio(data || []))
            .catch(err => console.error("Failed to fetch portfolio:", err));

        // Connect to WebSocket
        const socket = new SockJS('http://localhost:8080/ws');
        const stompClient = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                console.log('Connected to WebSocket');
                setIsConnected(true);
                stompClient.subscribe('/topic/stocks', (message) => {
                    const data = JSON.parse(message.body);
                    setStocks(data);
                });
            },
            onDisconnect: () => {
                console.log('Disconnected');
                setIsConnected(false);
            },
            onStompError: () => {
                setIsConnected(false);
            },
            onWebSocketClose: () => {
                setIsConnected(false);
            }
        });

        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    }, []);

    // Effect to update prevPrices ref when stocks change, to handle "flash" effect logic
    useEffect(() => {
        stocks.forEach(stock => {
            prevPricesRef.current[stock.symbol] = stock.price;
        });
    }, [stocks]);

    const getPriceColor = (symbol, currentPrice) => {
        const prevPrice = prevPricesRef.current[symbol];
        if (!prevPrice) return 'text-white';
        if (currentPrice > prevPrice) return 'text-green-400';
        if (currentPrice < prevPrice) return 'text-red-400';
        return 'text-white';
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            pChange: '',
            perChange30d: '',
            perChange365d: '',
            industry: '',
            symbol: ''
        });
        setSortConfig({ key: null, direction: null });
    };

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = null;
        }
        setSortConfig({ key, direction });
    };

    const toggleWatchlist = (symbol) => {
        setWatchlist(prev =>
            prev.includes(symbol)
                ? prev.filter(s => s !== symbol)
                : [...prev, symbol]
        );
    };

    const togglePortfolio = async (symbol) => {
        const isInPortfolio = portfolio.includes(symbol);
        try {
            const method = isInPortfolio ? 'DELETE' : 'POST';
            await fetch(`http://localhost:8080/api/stocks/portfolio/${symbol}`, { method });

            setPortfolio(prev =>
                isInPortfolio
                    ? prev.filter(s => s !== symbol)
                    : [...prev, symbol]
            );
        } catch (err) {
            console.error("Failed to update portfolio:", err);
        }
    };

    const sortedStocks = React.useMemo(() => {
        let baseStocks = stocks;

        // Inject dummy data if offline and no data exists
        if (!isConnected && stocks.length === 0) {
            baseStocks = [DUMMY_STOCK];
        }

        let sortableStocks = baseStocks.filter(stock => {
            // Watchlist filter
            if (showWatchlistOnly && !watchlist.includes(stock.symbol)) return false;

            // Portfolio filter
            if (showPortfolioOnly && !portfolio.includes(stock.symbol)) return false;

            // Symbol or Company Name text filter
            if (filters.symbol) {
                const searchTerm = filters.symbol.toLowerCase();
                const symbolMatch = stock.symbol.toLowerCase().includes(searchTerm);
                const companyMatch = (stock.companyName || '').toLowerCase().includes(searchTerm);
                if (!symbolMatch && !companyMatch) return false;
            }

            // Industry text filter
            if (filters.industry && !(stock.industry || '').toLowerCase().includes(filters.industry.toLowerCase())) {
                return false;
            }

            const pChangeMin = parseFloat(filters.pChange);
            const p30Min = parseFloat(filters.perChange30d);
            const p365Min = parseFloat(filters.perChange365d);

            if (!isNaN(pChangeMin) && (stock.pChange || 0) < pChangeMin) return false;
            if (!isNaN(p30Min) && (stock.perChange30d || 0) < p30Min) return false;
            if (!isNaN(p365Min) && (stock.perChange365d || 0) < p365Min) return false;

            return true;
        });

        if (sortConfig.key !== null && sortConfig.direction !== null) {
            sortableStocks.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (typeof aValue === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }

                const nA = aValue || 0;
                const nB = bValue || 0;
                if (nA < nB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (nA > nB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableStocks;
    }, [stocks, filters, sortConfig, watchlist, showWatchlistOnly, portfolio, showPortfolioOnly]);

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Min Daily %</label>
                    <input
                        type="number"
                        name="pChange"
                        value={filters.pChange}
                        onChange={handleFilterChange}
                        placeholder="e.g. 1.5"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-600"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Min 30D %</label>
                    <input
                        type="number"
                        name="perChange30d"
                        value={filters.perChange30d}
                        onChange={handleFilterChange}
                        placeholder="e.g. 5.0"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-600"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Min 365D %</label>
                    <input
                        type="number"
                        name="perChange365d"
                        value={filters.perChange365d}
                        onChange={handleFilterChange}
                        placeholder="e.g. 20.0"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-600"
                    />
                </div>
                <div className="flex items-end gap-2">
                    <button
                        onClick={() => {
                            setShowWatchlistOnly(!showWatchlistOnly);
                            if (!showWatchlistOnly) setShowPortfolioOnly(false);
                        }}
                        className={classNames(
                            "flex-1 text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-all duration-200 border flex items-center justify-center gap-2",
                            showWatchlistOnly
                                ? "bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                                : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                        )}
                    >
                        <Star size={14} fill={showWatchlistOnly ? "currentColor" : "none"} />
                        {showWatchlistOnly ? "Watchlist Active" : "View Watchlist"}
                    </button>
                    <button
                        onClick={() => {
                            setShowPortfolioOnly(!showPortfolioOnly);
                            if (!showPortfolioOnly) setShowWatchlistOnly(false);
                        }}
                        className={classNames(
                            "flex-1 text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-all duration-200 border flex items-center justify-center gap-2",
                            showPortfolioOnly
                                ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                        )}
                    >
                        <Briefcase size={14} fill={showPortfolioOnly ? "currentColor" : "none"} />
                        {showPortfolioOnly ? "Portfolio Active" : "View Portfolio"}
                    </button>
                    <button
                        onClick={clearFilters}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors duration-200 border border-gray-600"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl bg-gray-800 border border-gray-700 shadow-2xl">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900 border-b border-gray-700 uppercase tracking-wider text-xs font-semibold text-gray-400">
                        <tr>
                            <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                    <span>Symbol</span>
                                    <input
                                        type="text"
                                        name="symbol"
                                        value={filters.symbol}
                                        onChange={handleFilterChange}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Filter..."
                                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-normal w-full"
                                    />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left cursor-pointer hover:text-white transition-colors w-48"
                                onClick={() => requestSort('industry')}
                            >
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1">
                                        Industry
                                        {sortConfig.key === 'industry' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        ) : <ChevronDown size={14} className="opacity-20" />}
                                    </div>
                                    <input
                                        type="text"
                                        name="industry"
                                        value={filters.industry}
                                        onChange={handleFilterChange}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Filter..."
                                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-normal w-full"
                                    />
                                </div>
                            </th>
                            <th className="px-6 py-4 text-right">Price</th>
                            <th
                                className="px-6 py-4 text-right hidden xl:table-cell cursor-pointer hover:text-white transition-colors w-32"
                                onClick={() => requestSort('ffmc')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    FFMC (Cr)
                                    {sortConfig.key === 'ffmc' ? (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    ) : <ChevronDown size={14} className="opacity-20" />}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors"
                                onClick={() => requestSort('pChange')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    % Change
                                    {sortConfig.key === 'pChange' ? (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    ) : <ChevronDown size={14} className="opacity-20" />}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-right hidden xl:table-cell cursor-pointer hover:text-white transition-colors"
                                onClick={() => requestSort('perChange30d')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    30D %
                                    {sortConfig.key === 'perChange30d' ? (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    ) : <ChevronDown size={14} className="opacity-20" />}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-right hidden xl:table-cell cursor-pointer hover:text-white transition-colors"
                                onClick={() => requestSort('perChange365d')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    365D %
                                    {sortConfig.key === 'perChange365d' ? (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    ) : <ChevronDown size={14} className="opacity-20" />}
                                </div>
                            </th>
                            <th className="px-6 py-4 text-right hidden md:table-cell">Day Range</th>
                            <th className="px-6 py-4 text-right hidden xl:table-cell">Year Range</th>
                            <th className="px-6 py-4 text-right hidden lg:table-cell">GapToHigh/GapToLow</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {sortedStocks.map((stock) => {
                            const prevPrice = prevPricesRef.current[stock.symbol] || stock.price;
                            const priceClass = stock.price > prevPrice
                                ? 'animate-flash-green text-green-400'
                                : stock.price < prevPrice
                                    ? 'animate-flash-red text-red-400'
                                    : 'text-white';

                            // Calculate % change from Day Low as a simple metric substitute or just show trending icon
                            const isUp = stock.price >= stock.dayLow;

                            return (
                                <tr key={stock.symbol} className="hover:bg-gray-750 transition-colors duration-150">
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => toggleWatchlist(stock.symbol)}
                                                className={classNames(
                                                    "p-1.5 rounded-md transition-all duration-200",
                                                    watchlist.includes(stock.symbol)
                                                        ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                                                        : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                                                )}
                                                title={watchlist.includes(stock.symbol) ? "Remove from watchlist" : "Add to watchlist"}
                                            >
                                                <Star size={14} fill={watchlist.includes(stock.symbol) ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                                onClick={() => togglePortfolio(stock.symbol)}
                                                className={classNames(
                                                    "p-1.5 rounded-md transition-all duration-200",
                                                    portfolio.includes(stock.symbol)
                                                        ? "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                                                        : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                                                )}
                                                title={portfolio.includes(stock.symbol) ? "Remove from portfolio" : "Add to portfolio"}
                                            >
                                                <Briefcase size={14} fill={portfolio.includes(stock.symbol) ? "currentColor" : "none"} />
                                            </button>
                                        </div>
                                        <div className="p-2 bg-gray-700 rounded-lg ml-1">
                                            <Activity size={18} className="text-blue-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-lg leading-tight font-bold">{stock.symbol}</span>
                                            <span className="text-xs text-gray-500 font-medium truncate max-w-[150px]" title={stock.companyName}>
                                                {(stock.companyName || 'N/A').split(' ').slice(0, 3).join(' ')}
                                            </span>
                                            {stock.symbol === 'DEMO-NSE' && (
                                                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold uppercase w-fit mt-1">
                                                    Offline
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-left font-medium text-gray-400 w-48 truncate">
                                        <span className="text-sm" title={stock.industry}>{(stock.industry || 'N/A').split(' ').slice(0, 3).join(' ')}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-lg font-bold">
                                        <div className={classNames("flex items-center justify-end gap-2 transition-colors duration-300", priceClass)}>
                                            {formatCurrency(stock.price)}
                                            {stock.price > prevPrice && <ArrowUp size={16} />}
                                            {stock.price < prevPrice && <ArrowDown size={16} />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono hidden xl:table-cell text-gray-400 w-32">
                                        {(stock.ffmc / 10000000).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold">
                                        <div className={classNames(
                                            "flex items-center justify-end gap-1",
                                            (stock.pChange || 0) >= 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {(stock.pChange || 0) >= 0 ? '+' : ''}{(stock.pChange || 0).toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono hidden xl:table-cell">
                                        <div className={classNames(
                                            "text-xs font-bold",
                                            (stock.perChange30d || 0) >= 0 ? "text-green-500" : "text-red-500"
                                        )}>
                                            {(stock.perChange30d || 0) >= 0 ? '+' : ''}{(stock.perChange30d || 0).toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono hidden xl:table-cell">
                                        <div className={classNames(
                                            "text-xs font-bold",
                                            (stock.perChange365d || 0) >= 0 ? "text-green-500" : "text-red-500"
                                        )}>
                                            {(stock.perChange365d || 0) >= 0 ? '+' : ''}{(stock.perChange365d || 0).toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-400 hidden md:table-cell">
                                        <div className="text-xs text-green-500/80 mb-1">H: {formatCurrency(stock.dayHigh)}</div>
                                        <div className="text-xs text-red-500/80">L: {formatCurrency(stock.dayLow)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-400 hidden xl:table-cell">
                                        <div className="text-xs text-green-500/80 mb-1">H: {formatCurrency(stock.yearHigh)}</div>
                                        <div className="text-xs text-red-500/80">L: {formatCurrency(stock.yearLow)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-400 hidden lg:table-cell">
                                        <div className="text-xs text-green-500/80 mb-1">H: {stock.weekHigh.toFixed(1)}%</div>
                                        <div className="text-xs text-red-500/80">L: {stock.weekLow.toFixed(1)}%</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {sortedStocks.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        {stocks.length === 0
                            ? "Waiting for market data..."
                            : showWatchlistOnly
                                ? (watchlist.length === 0 ? "Your watchlist is empty." : "No watchlisted stocks match your filters.")
                                : showPortfolioOnly
                                    ? (portfolio.length === 0 ? "Your portfolio is empty." : "No portfolio stocks match your filters.")
                                    : "No stocks match your filters."}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockTable;
