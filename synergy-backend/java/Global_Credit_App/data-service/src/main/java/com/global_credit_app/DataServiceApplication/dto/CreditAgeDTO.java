// dto/CreditAgeDTO.java
package com.global_credit_app.DataServiceApplication.dto;

public record CreditAgeDTO(
        Integer oldestMonths,
        java.math.BigDecimal avgMonths
) {}
