package com.nsetracker.backend;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@CrossOrigin(origins = "*") // Enable CORS for frontend
public class StockController {

    private final PortfolioService portfolioService;

    public StockController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
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
