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
public class WatchlistService {
    private static final Logger logger = LoggerFactory.getLogger(WatchlistService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String FILE_PATH = "watchlist.json";
    private Set<String> watchlistSymbols = new HashSet<>();

    @PostConstruct
    public void init() {
        loadWatchlist();
    }

    public synchronized void addStock(String symbol) {
        watchlistSymbols.add(symbol);
        saveWatchlist();
    }

    public synchronized void removeStock(String symbol) {
        watchlistSymbols.remove(symbol);
        saveWatchlist();
    }

    public List<String> getWatchlist() {
        return new ArrayList<>(watchlistSymbols);
    }

    private void loadWatchlist() {
        File file = new File(FILE_PATH);
        if (file.exists()) {
            try {
                List<String> symbols = objectMapper.readValue(file, new TypeReference<List<String>>() {
                });
                watchlistSymbols = new HashSet<>(symbols);
                logger.info("Loaded {} stocks from watchlist.json", watchlistSymbols.size());
            } catch (IOException e) {
                logger.error("Failed to load watchlist: {}", e.getMessage());
            }
        }
    }

    private void saveWatchlist() {
        try {
            objectMapper.writeValue(new File(FILE_PATH), new ArrayList<>(watchlistSymbols));
            logger.info("Saved watchlist to {}", FILE_PATH);
        } catch (IOException e) {
            logger.error("Failed to save watchlist: {}", e.getMessage());
        }
    }
}
