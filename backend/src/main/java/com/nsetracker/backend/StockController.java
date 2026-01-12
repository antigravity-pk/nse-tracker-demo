package com.nsetracker.backend;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@CrossOrigin(origins = "*") // Enable CORS for frontend
public class StockController {

    private final PortfolioService portfolioService;
    private final StockPriceService stockPriceService;
    private final WatchlistService watchlistService;

    public StockController(PortfolioService portfolioService, StockPriceService stockPriceService,
            WatchlistService watchlistService) {
        this.portfolioService = portfolioService;
        this.stockPriceService = stockPriceService;
        this.watchlistService = watchlistService;
    }

    @GetMapping("/watchlist")
    public List<String> getWatchlist() {
        return watchlistService.getWatchlist();
    }

    @PostMapping("/watchlist/{symbol}")
    public void addToWatchlist(@PathVariable String symbol) {
        watchlistService.addStock(symbol);
    }

    @DeleteMapping("/watchlist/{symbol}")
    public void removeFromWatchlist(@PathVariable String symbol) {
        watchlistService.removeStock(symbol);
    }

    @GetMapping("/update-poll-time")
    public void updatePollTime(@RequestParam(required = false) Long pollTime) {
        stockPriceService.setThreadPollTime(pollTime);
    }

    @GetMapping("/ping")
    public String ping() {
        return "pong";
    }

    @GetMapping("/portfolio")
    public List<String> getPortfolio() {
        return portfolioService.getPortfolio();
    }

    @PostMapping("/portfolio/{symbol}")
    public void addToPortfolio(@PathVariable String symbol) {
        portfolioService.addStock(symbol);
    }

    @DeleteMapping("/portfolio/{symbol}")
    public void removeFromPortfolio(@PathVariable String symbol) {
        portfolioService.removeStock(symbol);
    }
}
