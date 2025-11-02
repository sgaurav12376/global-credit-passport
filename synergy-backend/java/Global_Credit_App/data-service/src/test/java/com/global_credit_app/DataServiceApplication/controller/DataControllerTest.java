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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = DataController.class)
class DataControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DataService service;

    @Test
    void accounts_ok() throws Exception {
        when(service.getAccounts(any(), any())).thenReturn(List.of(
                new AccountDTO("acc-1","Name","Official","checking","standard",null,null,null,null,null,null,null)
        ));

        mockMvc.perform(get("/api/data/accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].accountId").value("acc-1"))
                .andExpect(jsonPath("$[0].accountType").value("checking"));
    }

    @Test
    void accountMix_ok() throws Exception {
        var resp = new AccountMixResponseDTO(2, new BigDecimal("100"), new BigDecimal("0.5"),
                List.of(new AccountMixEntryDTO("Payments", 1, new BigDecimal("60"), new BigDecimal("0.6"))));
        when(service.getAccountMix()).thenReturn(resp);

        mockMvc.perform(get("/api/data/account-mix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAccounts").value(2))
                .andExpect(jsonPath("$.entries[0].category").value("Payments"));
    }

    @Test
    void activeAccounts_ok() throws Exception {
        when(service.getActiveAccounts()).thenReturn(new ActiveAccountsDTO(3, new BigDecimal("250.00")));
        mockMvc.perform(get("/api/data/active-accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeAccounts").value(3));
    }

    @Test
    void globalScore_ok() throws Exception {
        when(service.getGlobalScore()).thenReturn(new GlobalScoreDTO(770, "Very Good"));
        mockMvc.perform(get("/api/data/global-score"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.globalScore").value(770))
                .andExpect(jsonPath("$.band").value("Very Good"));
    }

    @Test
    void creditAge_ok() throws Exception {
        when(service.getCreditAge()).thenReturn(new CreditAgeDTO(84, new BigDecimal("40.2")));
        mockMvc.perform(get("/api/data/credit-age"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.oldestMonths").value(84));
    }

    @Test
    void paymentHistory_ok() throws Exception {
        when(service.getPaymentHistory()).thenReturn(new PaymentHistoryDTO(5,1,0,0,6,new BigDecimal("0.8333")));
        mockMvc.perform(get("/api/data/payment-history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.countOnTime").value(5))
                .andExpect(jsonPath("$.totalAccounts").value(6));
    }
}
