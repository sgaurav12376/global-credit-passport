package com.global_credit_app.DataServiceApplication.service;

import com.global_credit_app.DataServiceApplication.dto.*;
import com.global_credit_app.DataServiceApplication.repo.DataQueryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataServiceTest {

    @Mock
    private DataQueryRepository repo;

    @InjectMocks
    private DataService service;

    @Test
    void getUtilization_returnsSummaryAndLines() {
        // --- Arrange ---
        UtilizationDTO summary = new UtilizationDTO(
                new BigDecimal("35.25"),   // utilizationPercent
                new BigDecimal("3525.00"), // currentBalance
                new BigDecimal("6475.00"), // availableCredit
                new BigDecimal("10000.00") // overallLimit
        );

        UtilizationLineDTO line = new UtilizationLineDTO(
                "acc-cc-1234",
                "Travel Mastercard",
                new BigDecimal("3525.00"),
                new BigDecimal("10000.00"),
                new BigDecimal("35.25"),
                null,
                null,
                null,
                null,
                "USD"
        );

        when(repo.getRevolvingUtilization())
                .thenReturn(new UtilizationResponseDTO(summary, List.of(line)));

        // --- Act ---
        UtilizationResponseDTO dto = service.getUtilization();

        // --- Assert ---
        assertNotNull(dto);
        assertNotNull(dto.summary());
        assertEquals(new BigDecimal("35.25"), dto.summary().utilizationPercent());
        assertEquals(new BigDecimal("10000.00"), dto.summary().overallLimit());
        assertEquals(1, dto.lines().size());
        assertEquals("acc-cc-1234", dto.lines().get(0).accountId());
    }

    @Test
    void getAccountMix_basicSmoke() {
        when(repo.getAccountMix()).thenReturn(
                new AccountMixResponseDTO(
                        2,
                        new BigDecimal("200.00"),
                        new BigDecimal("0.50"),
                        List.of(new AccountMixEntryDTO("Payments", 1, new BigDecimal("120.00"), new BigDecimal("0.60")))
                )
        );

        AccountMixResponseDTO mix = service.getAccountMix();
        assertEquals(2, mix.totalAccounts());
        assertEquals(new BigDecimal("200.00"), mix.totalExposure());
        assertFalse(mix.entries().isEmpty());
        assertEquals("Payments", mix.entries().get(0).category());
    }
}
