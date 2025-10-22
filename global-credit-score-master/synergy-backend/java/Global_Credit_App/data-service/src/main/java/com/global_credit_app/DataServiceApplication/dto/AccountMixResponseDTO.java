// dto/AccountMixResponseDTO.java
package com.global_credit_app.DataServiceApplication.dto;

import java.math.BigDecimal;
import java.util.List;

public record AccountMixResponseDTO(
        Integer totalAccounts,
        BigDecimal totalExposure,
        BigDecimal diversityIndex,   // HHI on exposure shares (0–1); lower = more diverse
        List<AccountMixEntryDTO> entries
) {}
