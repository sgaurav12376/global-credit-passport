package com.global_credit_app.DataServiceApplication.dto;

import java.math.BigDecimal;
public record AccountDTO(
        String accountId, String name, String officialName,
        String accountType, String accountSubtype, String holderCategory,
        BigDecimal balAvailable, BigDecimal balCurrent, BigDecimal creditLimit,
        String currency, String institutionId, String institutionName
) {}
