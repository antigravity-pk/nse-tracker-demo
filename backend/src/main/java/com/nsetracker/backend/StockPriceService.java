package com.nsetracker.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class StockPriceService {

    private static final Logger logger = LoggerFactory.getLogger(StockPriceService.class);
    private final SimpMessagingTemplate messagingTemplate;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final TaskScheduler taskScheduler;

    // NSE requires cookies to be set, so we store them after hitting the homepage
    private List<String> cookies;

    public StockPriceService(SimpMessagingTemplate messagingTemplate, RestTemplate restTemplate,
            TaskScheduler taskScheduler) {
        this.messagingTemplate = messagingTemplate;
        this.restTemplate = restTemplate;
        this.taskScheduler = taskScheduler;
        this.objectMapper = new ObjectMapper();
    }

    private void refreshCookies() {
        try {
            logger.info("Refreshing NSE cookies...");
            HttpHeaders headers = new HttpHeaders();
            headers.add("Host", "www.nseindia.com");
            headers.add("Referer", "https://www.google.com/");
            headers.add("Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7");
            headers.add("Accept-Language", "en-US,en;q=0.9");
            headers.add("Cache-Control", "no-cache");
            headers.add("Connection", "keep-alive");
            headers.add("Pragma", "no-cache");
            headers.add("Sec-Ch-Ua", "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"");
            headers.add("Sec-Ch-Ua-Mobile", "?0");
            headers.add("Sec-Ch-Ua-Platform", "\"Windows\"");
            headers.add("Sec-Fetch-Dest", "document");
            headers.add("Sec-Fetch-Mode", "navigate");
            headers.add("Sec-Fetch-Site", "cross-site");
            headers.add("Sec-Fetch-User", "?1");
            headers.add("Upgrade-Insecure-Requests", "1");
            headers.add("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    "https://www.nseindia.com/get-quotes/equity?symbol=SBIN", HttpMethod.GET, entity, String.class);

            this.cookies = response.getHeaders().get("Set-Cookie");

            if (this.cookies != null && !this.cookies.isEmpty()) {
                logger.info("Initial cookies captured. Warming up session...");
                // Warm up call
                HttpHeaders warmHeaders = new HttpHeaders();
                warmHeaders.add("Host", "www.nseindia.com");
                warmHeaders.add("Referer", "https://www.nseindia.com/get-quotes/equity?symbol=SBIN");
                warmHeaders.add("Accept", "application/json, text/plain, */*");
                warmHeaders.add("Accept-Language", "en-US,en;q=0.9");
                warmHeaders.add("Connection", "keep-alive");
                warmHeaders.add("X-Requested-With", "XMLHttpRequest");
                warmHeaders.add("User-Agent",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");

                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < cookies.size(); i++) {
                    sb.append(cookies.get(i).split(";")[0]);
                    if (i < cookies.size() - 1)
                        sb.append("; ");
                }
                warmHeaders.add("Cookie", sb.toString());

                HttpEntity<String> warmEntity = new HttpEntity<>(warmHeaders);
                try {
                    Thread.sleep(1000); // Small delay to let session settle
                    restTemplate.exchange("https://www.nseindia.com/api/marketStatus", HttpMethod.GET, warmEntity,
                            String.class);
                    logger.info("Session warmed up with marketStatus");
                } catch (Exception e) {
                    logger.warn("Warm up call failed, but proceeding: {}", e.getMessage());
                }
            } else {
                logger.warn("Initial request successful but no cookies returned. Status: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("Failed to refresh cookies: {}", e.getMessage());
        }
    }

    @PostConstruct
    public void startPolling() {
        // Start the first poll immediately (or with a small delay)
        scheduleNextPoll(1000);
    }

    private void scheduleNextPoll(long delayMs) {
        taskScheduler.schedule(this::fetchNseDataAndReschedule, Instant.now().plusMillis(delayMs));
    }

    private void fetchNseDataAndReschedule() {
        try {
            fetchNseData();
        } finally {
            // Random delay between 60s (60000ms) and 90s (90000ms)
            long nextDelay = ThreadLocalRandom.current().nextLong(60000, 90001);
            logger.info("Next NSE data fetch scheduled in {} seconds", nextDelay / 1000);
            scheduleNextPoll(nextDelay);
        }
    }

    public void fetchNseData() {
        if (cookies == null || cookies.isEmpty()) {
            refreshCookies();
        }

        try {
            String url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY 500";

            HttpHeaders headers = new HttpHeaders();
            headers.add("Host", "www.nseindia.com");
            headers.add("Referer", "https://www.nseindia.com/market-data/live-equity-market");
            headers.add("Accept", "application/json, text/plain, */*");
            headers.add("Accept-Language", "en-US,en;q=0.9");
            headers.add("Connection", "keep-alive");
            headers.add("X-Requested-With", "XMLHttpRequest");
            headers.add("Sec-Ch-Ua", "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"");
            headers.add("Sec-Ch-Ua-Mobile", "?0");
            headers.add("Sec-Ch-Ua-Platform", "\"Windows\"");
            headers.add("Sec-Fetch-Dest", "empty");
            headers.add("Sec-Fetch-Mode", "cors");
            headers.add("Sec-Fetch-Site", "same-origin");
            headers.add("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");
            // Add cookies to request in a single header
            if (cookies != null && !cookies.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < cookies.size(); i++) {
                    sb.append(cookies.get(i).split(";")[0]);
                    if (i < cookies.size() - 1) {
                        sb.append("; ");
                    }
                }
                headers.add("Cookie", sb.toString());
            }

            HttpEntity<String> entity = new HttpEntity<>(headers);

            logger.info("Fetching data from NSE: {}", url);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            String body = response.getBody();
            if (body != null && !body.trim().isEmpty()) {
                processResponse(body);
            } else {
                logger.warn("Empty response body from NSE. Status: {}", response.getStatusCode());
            }

        } catch (Exception e) {
            logger.error("Error fetching NSE data: {}", e.getMessage());
            // Retry cookie fetch on next run if unauthorized
            if (e.getMessage().contains("401") || e.getMessage().contains("403")) {
                cookies = null;
            }
        }
    }

    private void processResponse(String jsonBody) {
        try {
            if (jsonBody == null || jsonBody.trim().isEmpty())
                return;
            JsonNode root = objectMapper.readTree(jsonBody);

            if (root == null || !root.has("data")) {
                logger.warn("JSON invalid or missing 'data'");
                return;
            }
            JsonNode dataNode = root.get("data");

            if (dataNode != null && dataNode.isArray()) {
                List<Stock> stocks = new ArrayList<>();
                for (JsonNode node : dataNode) {
                    if (node.has("symbol")) {
                        Stock stock = new Stock();
                        stock.setSymbol(node.path("symbol").asText());
                        stock.setPrice(node.path("lastPrice").asDouble(0.0));
                        stock.setDayHigh(node.path("dayHigh").asDouble(0.0));
                        stock.setDayLow(node.path("dayLow").asDouble(0.0));

                        stock.setYearHigh(node.path("yearHigh").asDouble(0.0));
                        stock.setYearLow(node.path("yearLow").asDouble(0.0));

                        stock.setWeekHigh(node.path("nearWKH").asDouble(0.0));
                        stock.setWeekLow(node.path("nearWKL").asDouble(0.0));
                        stock.setPChange(node.path("pChange").asDouble(0.0));
                        stock.setPerChange30d(node.path("perChange30d").asDouble(0.0));
                        stock.setPerChange365d(node.path("perChange365d").asDouble(0.0));
                        stock.setFfmc(node.path("ffmc").asDouble(0.0));
                        stock.setIndustry(node.path("meta").path("industry").asText("N/A"));
                        stock.setCompanyName(node.path("meta").path("companyName").asText("N/A"));

                        stocks.add(stock);
                    }
                }
                logger.info("Broadcasted {} stocks", stocks.size());
                messagingTemplate.convertAndSend("/topic/stocks", stocks);
            }
        } catch (Exception e) {
            logger.error("Error parsing NSE response", e);
        }
    }
}
