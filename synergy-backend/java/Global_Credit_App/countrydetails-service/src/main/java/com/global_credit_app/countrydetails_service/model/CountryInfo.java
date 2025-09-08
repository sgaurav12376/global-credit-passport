package com.global_credit_app.countrydetails_service.model;

public class CountryInfo {
    private String countryCode;
    private String countryName;
    private String currency;

    public CountryInfo(String countryCode, String countryName, String currency) {
        this.countryCode = countryCode;
        this.countryName = countryName;
        this.currency = currency;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public String getCountryName() {
        return countryName;
    }

    public String getCurrency() {
        return currency;
    }
}