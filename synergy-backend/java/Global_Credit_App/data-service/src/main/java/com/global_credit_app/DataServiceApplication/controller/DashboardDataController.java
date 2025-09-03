package com.global_credit_app.DataServiceApplication.controller;

import com.global_credit_app.DataServiceApplication.service.DataService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard-data")
@RequiredArgsConstructor
public class DashboardDataController {
    private final DataService svc;

    @GetMapping("/overview")
    public Map<String, Object> overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate incomeFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate incomeTo) {
        return Map.of(
                "accounts",        svc.getAccounts(null, null),
                "utilization",     svc.getUtilization(),
                "accountMix",      svc.getAccountMix(),
                "activeAccounts",  svc.getActiveAccounts(),
                "creditAge",       svc.getCreditAge(),
                "paymentHistory",  svc.getPaymentHistory(),
                "globalScore",     svc.getGlobalScore()
        );
    }
}

