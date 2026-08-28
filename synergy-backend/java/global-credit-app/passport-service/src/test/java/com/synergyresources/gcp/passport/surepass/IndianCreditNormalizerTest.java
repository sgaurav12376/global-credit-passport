package com.synergyresources.gcp.passport.surepass;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class IndianCreditNormalizerTest {
  private final ObjectMapper objectMapper = new ObjectMapper();
  private final IndianCreditNormalizer normalizer = new IndianCreditNormalizer();

  @Test
  void normalizesCrifSummaryAndMasksAccountNumber() throws Exception {
    var response = objectMapper.readTree("""
        {
          "data": {
            "client_id": "crif-test-reference",
            "credit_score": "700",
            "credit_report": {
              "ACCOUNTS-SUMMARY": {
                "DERIVED-ATTRIBUTES": {
                  "LENGTH-OF-CREDIT-HISTORY-YEAR": "6",
                  "LENGTH-OF-CREDIT-HISTORY-MONTH": "5",
                  "INQURIES-IN-LAST-SIX-MONTHS": "3"
                },
                "PRIMARY-ACCOUNTS-SUMMARY": {
                  "PRIMARY-NUMBER-OF-ACCOUNTS": "1",
                  "PRIMARY-ACTIVE-NUMBER-OF-ACCOUNTS": "1",
                  "PRIMARY-OVERDUE-NUMBER-OF-ACCOUNTS": "0",
                  "PRIMARY-SECURED-NUMBER-OF-ACCOUNTS": "1",
                  "PRIMARY-UNSECURED-NUMBER-OF-ACCOUNTS": "0",
                  "PRIMARY-CURRENT-BALANCE": "1,00,000",
                  "PRIMARY-SANCTIONED-AMOUNT": "1,50,000"
                }
              },
              "RESPONSES": {
                "RESPONSE": [{
                  "LOAN-DETAILS": {
                    "ACCT-NUMBER": "SECRET1234",
                    "ACCT-TYPE": "Home Loan",
                    "ACCOUNT-STATUS": "Active",
                    "CURRENT-BAL": "1,00,000",
                    "DISBURSED-AMT": "1,50,000",
                    "OVERDUE-AMT": "0",
                    "WRITE-OFF-AMT": "0",
                    "COMBINED-PAYMENT-HISTORY": "Jul:2025,025/XXX|Jun:2025,000/XXX|"
                  }
                }]
              }
            }
          },
          "success": true
        }
        """);

    NormalizedCreditReport result = normalizer.normalizeCrif(response);

    assertThat(result.bureau()).isEqualTo("CRIF");
    assertThat(result.creditScore()).isEqualTo(700);
    assertThat(result.summary().currentBalance()).isEqualByComparingTo("100000");
    assertThat(result.summary().creditHistoryMonths()).isEqualTo(77);
    assertThat(result.summary().maximumDaysPastDue()).isEqualTo(25);
    assertThat(result.tradelines()).hasSize(1);
    assertThat(result.tradelines().get(0).maskedAccountNumber()).isEqualTo("****1234");
  }

  @Test
  void normalizesExperianSummaryAndDpdHistory() throws Exception {
    var response = objectMapper.readTree("""
        {
          "data": {
            "client_id": "experian-test-reference",
            "credit_score": "792",
            "credit_report": {
              "CAIS_Account": {
                "CAIS_Summary": {
                  "Credit_Account": {
                    "CreditAccountTotal": 1,
                    "CreditAccountActive": 1,
                    "CreditAccountDefault": 0,
                    "CreditAccountClosed": 0
                  },
                  "Total_Outstanding_Balance": {
                    "Outstanding_Balance_All": 122679
                  }
                },
                "CAIS_Account_DETAILS": [{
                  "Account_Number": "MASKED7938",
                  "Account_Type": 13,
                  "Account_Status": 11,
                  "Current_Balance": 1000,
                  "Amount_Past_Due": 0,
                  "Written_Off_Amt_Total": 0,
                  "Highest_Credit_or_Original_Loan_Amount": 114000,
                  "CAIS_Account_History": [
                    {"Year": 2023, "Month": 11, "Days_Past_Due": 0},
                    {"Year": 2023, "Month": 10, "Days_Past_Due": 26}
                  ]
                }]
              }
            }
          },
          "success": true
        }
        """);

    NormalizedCreditReport result = normalizer.normalizeExperian(response);

    assertThat(result.bureau()).isEqualTo("EXPERIAN");
    assertThat(result.creditScore()).isEqualTo(792);
    assertThat(result.summary().currentBalance()).isEqualByComparingTo(
        new BigDecimal("122679")
    );
    assertThat(result.summary().maximumDaysPastDue()).isEqualTo(26);
    assertThat(result.tradelines().get(0).maskedAccountNumber()).isEqualTo("****7938");
  }
}
