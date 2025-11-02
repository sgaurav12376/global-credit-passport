package com.global_credit_app.DataServiceApplication.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UtilizationLineDTO(
        String accountId,
        String name,
        BigDecimal balance,
        BigDecimal creditLimit,
        BigDecimal utilizationPercent,
        BigDecimal apr,
        LocalDate openedAt,
        LocalDate lastStatementAt,
        LocalDate nextDueAt,
        String currency
) {}
