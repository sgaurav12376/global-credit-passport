package com.global_credit_app.countrydetails_service.controller;

import com.global_credit_app.countrydetails_service.model.CountryInfo;
import com.global_credit_app.countrydetails_service.service.CountryDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/countries")
public class CountryDetailsController {

    @Autowired
    private CountryDetailsService countryDetailsService;

    @GetMapping("/{countryName}")
    public ResponseEntity<?> getCountryDetails(@PathVariable String countryName) {
        CountryInfo info = countryDetailsService.getDetailsByName(countryName);
        if (info != null) {
            return ResponseEntity.ok(info);
        } else {
            return ResponseEntity.badRequest().body("Country not found");
        }
    }
}