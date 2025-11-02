package com.global_credit_app.DataServiceApplication.controller;

import com.global_credit_app.DataServiceApplication.dto.*;
import com.global_credit_app.DataServiceApplication.service.DataService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = DataController.class)
class DashboardDataControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DataService service;

    @Test
    void utilization_ok() throws Exception {
        // summary
        UtilizationDTO summary = new UtilizationDTO(
                new BigDecimal("35.25"),
                new BigDecimal("3525.00"),
                new BigDecimal("6475.00"),
                new BigDecimal("10000.00")
        );
        // one line item
        UtilizationLineDTO line = new UtilizationLineDTO(
                "acc-cc-1234", "Travel Mastercard",
                new BigDecimal("3525.00"),
                new BigDecimal("10000.00"),
                new BigDecimal("35.25"),
                null, null, null, null,
                "USD"
        );
        when(service.getUtilization()).thenReturn(new UtilizationResponseDTO(summary, List.of(line)));

        mockMvc.perform(get("/api/data/utilization"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.utilizationPercent").value(35.25))
                .andExpect(jsonPath("$.summary.overallLimit").value(10000.00))
                .andExpect(jsonPath("$.lines[0].accountId").value("acc-cc-1234"))
                .andExpect(jsonPath("$.lines[0].utilizationPercent").value(35.25));
    }

    @Test
    void accountMix_ok() throws Exception {
        when(service.getAccountMix()).thenReturn(
                new AccountMixResponseDTO(
                        1,
                        new BigDecimal("100"),
                        new BigDecimal("0.5"),
                        List.of(new AccountMixEntryDTO("Payments", 1, new BigDecimal("100"), new BigDecimal("1.0")))
                )
        );

        mockMvc.perform(get("/api/data/account-mix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAccounts").value(1))
                .andExpect(jsonPath("$.entries[0].category").value("Payments"));
    }

    @Test
    void accounts_ok() throws Exception {
        when(service.getAccounts(null, null)).thenReturn(List.of(
                new AccountDTO("acc-1","Name","Official","checking","standard",null,null,null,null,"USD",null,null)
        ));

        mockMvc.perform(get("/api/data/accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].accountId").value("acc-1"))
                .andExpect(jsonPath("$[0].accountType").value("checking"));
    }
}
