// dto/AccountMixEntryDTO.java
package com.global_credit_app.DataServiceApplication.dto;

import java.math.BigDecimal;

public record AccountMixEntryDTO(
        String category,
        Integer accounts,
        BigDecimal exposure,
        BigDecimal exposureShare
) {}
