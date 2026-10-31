package com.synergyresources.gcp.passport.normalization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.SurepassCreditReport;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class NormalizedEvidenceSyncServiceTest {

  @Test
  void synchronizesOnlyNewestSimulationForTheSameBureauSource() throws Exception {
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    Passport passport = mock(Passport.class);
    when(passport.getId()).thenReturn(passportId);
    when(passport.getOriginCountry()).thenReturn("IN");
    when(passport.getResidenceCountry()).thenReturn("US");

    SurepassCreditReport balanced = simulatedReport(710, "balanced-new");
    SurepassCreditReport inheritedStrong = simulatedReport(790, "strong-inherited");
    NormalizedEvidenceService evidenceService = mock(NormalizedEvidenceService.class);
    when(evidenceService.currentEvidence(borrowerId, passportId)).thenReturn(List.of());
    when(evidenceService.coverage(borrowerId, passportId)).thenReturn(new EvidenceCoverage(
        "GCP_EVIDENCE_COVERAGE_V1", 0, 0, 0, Map.of(), List.of(), false
    ));
    NormalizedEvidenceSyncService service = new NormalizedEvidenceSyncService(
        new CreditNormalizationAdapter(), new PlaidCashflowNormalizationAdapter(),
        new EntrustIdentityNormalizationAdapter(), evidenceService,
        new ObjectMapper().findAndRegisterModules()
    );

    service.synchronize(
        borrowerId, passport, null, List.of(balanced, inheritedStrong), null
    );

    ArgumentCaptor<GcpNormalized.CreditDataset> dataset =
        ArgumentCaptor.forClass(GcpNormalized.CreditDataset.class);
    verify(evidenceService).saveCredit(eq(borrowerId), eq(passportId), dataset.capture());
    assertEquals(710, dataset.getValue().nativeScore().value());
  }

  private SurepassCreditReport simulatedReport(int score, String reference) throws Exception {
    SurepassCreditReport report = mock(SurepassCreditReport.class);
    when(report.getStatus()).thenReturn("SUCCESS");
    when(report.getBureau()).thenReturn("CIBIL_SIMULATED");
    when(report.getProviderReference()).thenReturn(reference);
    when(report.getConsentVersion()).thenReturn("gcp-local-credit-simulation-v1");
    when(report.getConsentedAt()).thenReturn(Instant.parse("2026-09-16T10:00:00Z"));
    when(report.getCreatedAt()).thenReturn(Instant.parse("2026-09-16T10:01:00Z"));
    when(report.getNormalizedReport()).thenReturn(
        new ObjectMapper().readTree("""
          {"bureau":"CIBIL_SIMULATED","providerReference":"%s",
           "creditScore":%d,"scoreMinimum":300,"scoreMaximum":900,
           "scoreFactors":[],"summary":{"totalAccounts":4,"activeAccounts":3,
           "closedAccounts":1,"overdueOrDefaultAccounts":1,"securedAccounts":1,
           "unsecuredAccounts":3,"currentBalance":120000,"sanctionedAmount":300000,
           "creditHistoryMonths":48,"recentEnquiries":3,"maximumDaysPastDue":30,
           "writtenOffAccounts":0},"tradelines":[],"dataQualityWarnings":[]}
          """.formatted(reference, score))
    );
    return report;
  }
}
