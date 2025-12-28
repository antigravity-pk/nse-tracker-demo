package com.nsetracker.backend;

public class PortfolioItem {
    private String symbol;

    public PortfolioItem() {
    }

    public PortfolioItem(String symbol) {
        this.symbol = symbol;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }
}
