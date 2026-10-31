package com.synergyresources.gcp.passport.surepass;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
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
                "AccountStatus":"Open","Balance":"1200","CreditLimit":"100000",
                "DateOpened":"2020-01-10","History48Months":[
                  {"PaymentStatus":"000"},{"PaymentStatus":"30+"}]}],
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
    assertEquals(30, reports.get(0).summary().maximumDaysPastDue());
    assertTrue(reports.get(0).summary().creditHistoryMonths() > 70);
    assertEquals("EXPERIAN", reports.get(1).bureau());
    assertEquals(790, reports.get(1).creditScore());
    assertTrue(reports.get(1).dataQualityWarnings().stream()
        .anyMatch(value -> value.contains("detailed response")));
  }

  @Test
  void acceptsFinpassEnvelopeAndPreservesPartialBureauOutcomes() throws Exception {
    var payload = mapper.readTree("""
        {"success":true,"status_code":200,"data":{"doc_id":"batch-123","results":{
          "equifax":{"success":false,"status_code":504,"message":"Gateway timeout",
            "data":"<html>timeout</html>"},
          "experian":{"success":false,"status_code":422,
            "message":"Consumer Not Found In Bureau","data":{"credit_report":{}}},
          "cibil":{"success":true,"message":"cibil report fetched successfully","data":{
            "client_id":"ci-1","credit_score":"673","credit_report":[{
              "response":{"consumerSummaryresp":{"accountSummary":{"totalAccounts":"1",
                "overdueAccounts":"0","currentBalance":"1200","highCreditAmount":"10000"},
                "inquirySummary":{"totalInquiry":"2"}}},
              "accounts":[{"accountNumber":"12345678","accountType":"10",
                "currentBalance":"1200","highCreditAmount":"10000","amountOverdue":"0",
                "dateOpened":"2020-01-01","dateReported":"2026-09-01"}],
              "scores":[{"reasonCodes":[]}] }] }},
          "crif":{"success":true,"message":"crif report fetched successfully","data":{
            "client_id":"cr-1","credit_score":"11","credit_report":{
              "SCORES":{"SCORE":{"SCORE-TYPE":"PERFORM CONSUMER 2.2","SCORE-VALUE":"11"}},
              "ACCOUNTS-SUMMARY":{"DERIVED-ATTRIBUTES":{},"PRIMARY-ACCOUNTS-SUMMARY":{
                "PRIMARY-NUMBER-OF-ACCOUNTS":"0","PRIMARY-ACTIVE-NUMBER-OF-ACCOUNTS":"0"}},
              "RESPONSES":{"RESPONSE":[]}}}}
        }}}
        """);

    var batch = new SurepassMultiBureauNormalizer(
        new IndianCreditNormalizer()
    ).normalizeBatch(payload);

    assertEquals("batch-123", batch.providerReference());
    assertEquals(2, batch.reports().size());
    assertEquals(List.of("CRIF", "CIBIL"), batch.reports().stream()
        .map(NormalizedCreditReport::bureau).toList());
    assertEquals(4, batch.outcomes().size());
    assertEquals(504, batch.outcomes().get(0).providerStatusCode());
    assertEquals("Consumer Not Found In Bureau", batch.outcomes().get(1).providerMessage());
    assertTrue(batch.outcomes().get(2).normalized());
    assertTrue(batch.outcomes().get(3).normalized());

    NormalizedCreditReport crif = batch.reports().get(0);
    assertEquals(11, crif.creditScore());
    assertEquals(null, crif.scoreMinimum());
    assertEquals(null, crif.scoreMaximum());
    assertTrue(crif.dataQualityWarnings().stream()
        .anyMatch(value -> value.contains("range was not supplied")));
  }
}
