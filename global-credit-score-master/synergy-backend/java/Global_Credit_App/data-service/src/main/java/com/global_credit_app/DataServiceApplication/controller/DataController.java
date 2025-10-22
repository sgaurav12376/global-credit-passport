package com.global_credit_app.DataServiceApplication.controller;

import com.global_credit_app.DataServiceApplication.dto.*;
import com.global_credit_app.DataServiceApplication.service.DataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/data")
@RequiredArgsConstructor
public class DataController {
    private final DataService service;

    @GetMapping("/accounts")
    public List<AccountDTO> accounts(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String subtype) {
        return service.getAccounts(type, subtype);
    }

    @GetMapping("/utilization")
    public UtilizationDTO utilization() {
        return service.getUtilization();
    }

    @GetMapping("/account-mix")
    public AccountMixResponseDTO accountMix() {
        return service.getAccountMix();
    }
    @GetMapping("/active-accounts")
    public ActiveAccountsDTO activeAccounts() {
        return service.getActiveAccounts();
    }

    @GetMapping("/global-score")
    public GlobalScoreDTO globalScore() {
        return service.getGlobalScore();
    }

    @GetMapping("/credit-age")
    public CreditAgeDTO creditAge() {
        return service.getCreditAge();
    }

    @GetMapping("/payment-history")
    public PaymentHistoryDTO paymentHistory() {
        return service.getPaymentHistory();
    }


}

