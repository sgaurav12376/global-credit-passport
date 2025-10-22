// dto/ActiveAccountsDTO.java
package com.global_credit_app.DataServiceApplication.dto;

import java.math.BigDecimal;

public record ActiveAccountsDTO(
        Integer activeAccounts,
        BigDecimal totalExposure
) {}
