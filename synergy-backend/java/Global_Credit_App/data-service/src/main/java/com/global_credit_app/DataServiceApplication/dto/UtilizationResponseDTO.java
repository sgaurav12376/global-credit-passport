package com.global_credit_app.DataServiceApplication.dto;

import java.util.List;

public record UtilizationResponseDTO(
        UtilizationDTO summary,
        List<UtilizationLineDTO> lines
) {}
