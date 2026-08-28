package com.synergyresources.gcp.passport.surepass;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class IndianCreditNormalizerCibilTest {
  private final ObjectMapper objectMapper = new ObjectMapper();
  private final IndianCreditNormalizer normalizer = new IndianCreditNormalizer();

  @Test
  void normalizesFinancialFieldsAndExcludesDirectIdentifiers() throws Exception {
    var response = objectMapper.readTree("""
        {
          "data": {
            "client_id": "credit_report_cibil_test",
            "credit_score": "750",
            "pan": "ABCPD1234E",
            "mobile": "9999999901",
            "credit_report": [{
              "emails": [{"emailID": "private@example.com"}],
              "addresses": [{"line1": "Private address"}],
              "scores": [{
                "reasonCodes": [{
                  "reasonCodeName": "reasonCode 39",
                  "reasonCodeValue": "39"
                }]
              }],
              "accounts": [{
                "accountType": "Credit Card",
                "accountNumber": "MOCKACCOUNT0001",
                "amountOverdue": "0",
                "currentBalance": "1000",
                "dateOpened": "2026-01-01",
                "dateReported": "2026-01-01",
                "highCreditAmount": "2000",
                "dateClosed": "NA",
                "woAmountTotal": "-1",
                "monthlyPayStatus": [{"date": "2026-01-01", "status": "0"}]
              }],
              "enquiries": [{"enquiryAmount": "1000"}],
              "response": {
                "consumerSummaryresp": {
                  "accountSummary": {
                    "totalAccounts": 1,
                    "highCreditAmount": 2000,
                    "currentBalance": 1000,
                    "overdueAccounts": 0,
                    "oldestDateOpened": "2026-01-01"
                  },
                  "inquirySummary": {"totalInquiry": 4}
                }
              }
            }]
          },
          "success": true
        }
        """);

    NormalizedCreditReport report = normalizer.normalizeCibil(response);

    assertEquals("CIBIL", report.bureau());
    assertEquals(750, report.creditScore());
    assertEquals(1, report.summary().totalAccounts());
    assertEquals(1, report.summary().activeAccounts());
    assertEquals(BigDecimal.valueOf(1000), report.summary().currentBalance());
    assertEquals(4, report.summary().recentEnquiries());
    assertEquals("reasonCode 39", report.scoreFactors().get(0));
    assertEquals(0, report.summary().maximumDaysPastDue());
    assertEquals("****0001", report.tradelines().get(0).maskedAccountNumber());
    assertTrue(report.tradelines().get(0).writtenOffAmount() == null);

    String storedJson = objectMapper.valueToTree(report).toString();
    assertFalse(storedJson.contains("ABCPD1234E"));
    assertFalse(storedJson.contains("9999999901"));
    assertFalse(storedJson.contains("private@example.com"));
    assertFalse(storedJson.contains("Private address"));
    assertFalse(storedJson.contains("MOCKACCOUNT0001"));
  }
}
