package com.global_credit_app.DataServiceApplication.service;

import com.global_credit_app.DataServiceApplication.dto.*;
import com.global_credit_app.DataServiceApplication.repo.DataQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DataService {
    private final DataQueryRepository repo;

    public List<AccountDTO> getAccounts(String type, String subtype) {
        return repo.findAccounts(nullIfBlank(type), nullIfBlank(subtype));
    }

    // Add inside DataService

    public UtilizationDTO getUtilization() {
        return repo.getRevolvingUtilization();
    }

    public AccountMixResponseDTO getAccountMix() {
        return repo.getAccountMix();
    }

    public ActiveAccountsDTO getActiveAccounts() {
        return repo.getActiveAccounts();
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    public GlobalScoreDTO getGlobalScore() {
        return repo.getGlobalScore();
    }

    public CreditAgeDTO getCreditAge() {
        return repo.getCreditAge();
    }

    public PaymentHistoryDTO getPaymentHistory() {
        return repo.getPaymentHistory();
    }

}
