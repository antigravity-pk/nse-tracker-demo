package com.nsetracker.backend;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PortfolioService {
    private static final Logger logger = LoggerFactory.getLogger(PortfolioService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String FILE_PATH = "portfolio.json";
    private Set<String> portfolioSymbols = new HashSet<>();

    @PostConstruct
    public void init() {
        loadPortfolio();
    }

    public synchronized void addStock(String symbol) {
        portfolioSymbols.add(symbol);
        savePortfolio();
    }

    public synchronized void removeStock(String symbol) {
        portfolioSymbols.remove(symbol);
        savePortfolio();
    }

    public List<String> getPortfolio() {
        return new ArrayList<>(portfolioSymbols);
    }

    private void loadPortfolio() {
        File file = new File(FILE_PATH);
        if (file.exists()) {
            try {
                List<String> symbols = objectMapper.readValue(file, new TypeReference<List<String>>() {
                });
                portfolioSymbols = new HashSet<>(symbols);
                logger.info("Loaded {} stocks from portfolio.json", portfolioSymbols.size());
            } catch (IOException e) {
                logger.error("Failed to load portfolio: {}", e.getMessage());
            }
        }
    }

    private void savePortfolio() {
        try {
            objectMapper.writeValue(new File(FILE_PATH), new ArrayList<>(portfolioSymbols));
            logger.info("Saved portfolio to {}", FILE_PATH);
        } catch (IOException e) {
            logger.error("Failed to save portfolio: {}", e.getMessage());
        }
    }
}
