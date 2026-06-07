package com.nsetracker.backend;

public class CompanyDetails {
    String name;
    String industry;

    public CompanyDetails(String name, String industry) {
        this.name = name;
        this.industry = industry;
    }

    public CompanyDetails() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIndustry() {
        return industry;
    }

    public void setIndustry(String industry) {
        this.industry = industry;
    }
}
