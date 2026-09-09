package com.synergyresources.gcp.passport.surepass;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class SurepassMultiBureauNormalizerTest {
  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void normalizesAvailableBureausIndependentlyAndMasksAccounts() throws Exception {
    var payload = mapper.readTree("""
        {"results":{
          "equifax":{"success":true,"data":{"client_id":"eq-1","credit_score":"785",
            "credit_report":{"CCRResponse":{"CIRReportDataLst":[{"CIRReportData":{
              "RetailAccountsSummary":{"NoOfAccounts":"1","NoOfActiveAccounts":"1",
                "NoOfWriteOffs":"0","TotalPastDue":"0","TotalCreditLimit":"100000",
                "TotalBalanceAmount":"1200"},
              "EnquirySummary":{"Past12Months":"1"},
              "RetailAccountDetails":[{"AccountNumber":"1234567890","AccountType":"Credit Card",
                "AccountStatus":"Open","Balance":"1200","CreditLimit":"100000"}],
              "ScoreDetails":[{"ScoringElements":[{"Description":"Strong payment history"}]}]
            }}]}}}},
          "experian":{"success":true,"data":{"client_id":"ex-1","credit_score":"790",
            "credit_report":{"CAIS_Account":{"CAIS_Summary":{"Credit_Account":{
              "CreditAccountTotal":"1","CreditAccountActive":"1","CreditAccountDefault":"0",
              "CreditAccountClosed":"0"},"Total_Outstanding_Balance":{
              "Outstanding_Balance_All":"1200"}}}}}},
          "crif":{"success":false,"message":"not available"}
        }}
        """);

    var reports = new SurepassMultiBureauNormalizer(
        new IndianCreditNormalizer()
    ).normalizeAvailable(payload);

    assertEquals(2, reports.size());
    assertEquals("EQUIFAX", reports.get(0).bureau());
    assertEquals("****7890", reports.get(0).tradelines().get(0).maskedAccountNumber());
    assertEquals(785, reports.get(0).creditScore());
    assertEquals("EXPERIAN", reports.get(1).bureau());
    assertEquals(790, reports.get(1).creditScore());
    assertTrue(reports.get(1).dataQualityWarnings().stream()
        .anyMatch(value -> value.contains("detailed response")));
  }
}
