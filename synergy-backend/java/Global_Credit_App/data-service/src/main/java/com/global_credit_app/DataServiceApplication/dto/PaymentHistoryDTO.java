// dto/PaymentHistoryDTO.java
package com.global_credit_app.DataServiceApplication.dto;

public record PaymentHistoryDTO(
        Integer countOnTime,
        Integer count30,
        Integer count60,
        Integer count90p,
        Integer totalAccounts,
        java.math.BigDecimal onTimeRatio
) {}
