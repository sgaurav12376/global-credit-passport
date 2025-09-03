package com.global_credit_app.countrydetails_service.service;

import com.global_credit_app.countrydetails_service.model.CountryInfo;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class CountryDetailsService {

    private static final Map<String, CountryInfo> COUNTRY_MAP = new HashMap<>();

    static {
        COUNTRY_MAP.put("India", new CountryInfo("+91", "India", "INR"));
        COUNTRY_MAP.put("USA", new CountryInfo("+1", "United States of America", "USD"));
    }

    public CountryInfo getDetailsByName(String name) {
        return COUNTRY_MAP.getOrDefault(name, null);
    }
}
