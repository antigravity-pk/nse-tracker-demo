package com.nsetracker.backend;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Stock {
    private String symbol;
    private double price;
    private double dayHigh;
    private double dayLow;
    private double weekHigh;
    private double weekLow;
    private double yearHigh;
    private double yearLow;
    @JsonProperty("pChange")
    private double pChange;
    @JsonProperty("perChange30d")
    private double perChange30d;
    @JsonProperty("perChange365d")
    private double perChange365d;
    private double ffmc;
    private String industry;
    private String companyName;
}
