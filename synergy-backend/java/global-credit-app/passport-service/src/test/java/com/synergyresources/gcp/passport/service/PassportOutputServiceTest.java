package com.synergyresources.gcp.passport.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.PassportOutput;
import com.synergyresources.gcp.passport.model.PlaidFinancialSnapshot;
import com.synergyresources.gcp.passport.model.SurepassCreditReport;
import com.synergyresources.gcp.passport.model.EntrustVerification;
import com.synergyresources.gcp.passport.repo.PassportOutputRepo;
import com.synergyresources.gcp.passport.repo.PlaidFinancialSnapshotRepo;
import com.synergyresources.gcp.passport.repo.SurepassCreditReportRepo;
import com.synergyresources.gcp.passport.normalization.EvidenceCoverage;
import com.synergyresources.gcp.passport.normalization.NormalizedEvidenceSyncService;
import com.synergyresources.gcp.passport.normalization.CreditBureauReconciliationService;
import com.synergyresources.gcp.passport.risk.DeterministicRiskAssessmentService;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PassportOutputServiceTest {
  private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

  @Test
  void combinesPlaidSurepassAndNonBlockingSandboxIdentityEvidence() {
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    PassportOutputRepo outputRepo = mock(PassportOutputRepo.class);
    PlaidFinancialSnapshotRepo plaidRepo = mock(PlaidFinancialSnapshotRepo.class);
    SurepassCreditReportRepo surepassRepo = mock(SurepassCreditReportRepo.class);
    NormalizedEvidenceSyncService evidenceSync = mock(NormalizedEvidenceSyncService.class);
    CreditBureauReconciliationService reconciliation = new CreditBureauReconciliationService();
    DeterministicRiskAssessmentService riskAssessment = new DeterministicRiskAssessmentService();
    Passport passport = passport(passportId);
    PlaidFinancialSnapshot plaid = mock(PlaidFinancialSnapshot.class);
    SurepassCreditReport surepass = mock(SurepassCreditReport.class);
    EntrustVerification entrust = mock(EntrustVerification.class);

    when(plaid.getId()).thenReturn(UUID.randomUUID());
    when(plaid.getMethodologyVersion()).thenReturn("PLAID_CASHFLOW_V1");
    when(plaid.getCreatedAt()).thenReturn(Instant.parse("2026-09-08T12:00:00Z"));
    when(plaid.getSummary()).thenReturn(mapper.createObjectNode().put("analyzedTransactions", 24));
    when(plaid.getSourceItemIds()).thenReturn(mapper.createArrayNode().add("item-sandbox"));
    when(surepass.getId()).thenReturn(UUID.randomUUID());
    when(surepass.getBureau()).thenReturn("CIBIL");
    when(surepass.getProviderReference()).thenReturn("sandbox-report");
    when(surepass.getCreatedAt()).thenReturn(Instant.parse("2026-09-08T12:01:00Z"));
    when(surepass.getNormalizedReport()).thenReturn(mapper.createObjectNode().put("creditScore", 750));
    when(surepass.getConsentVersion()).thenReturn("pilot-v1");
    when(surepass.getConsentedAt()).thenReturn(Instant.parse("2026-09-08T11:59:00Z"));
    when(entrust.getId()).thenReturn(UUID.randomUUID());
    when(entrust.getStatus()).thenReturn("DECLINED");
    when(entrust.getWorkflowRunId()).thenReturn("sandbox-run");
    when(entrust.getWorkflowId()).thenReturn("sandbox-workflow");
    when(entrust.getStartedAt()).thenReturn(Instant.parse("2026-09-08T11:58:00Z"));
    when(plaidRepo.findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId))
        .thenReturn(Optional.of(plaid));
    when(surepass.getStatus()).thenReturn("SUCCESS");
    when(surepassRepo.findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId))
        .thenReturn(List.of(surepass));
    when(evidenceSync.synchronize(borrowerId, passport, plaid, List.of(surepass), entrust))
        .thenReturn(new NormalizedEvidenceSyncService.SyncResult(
            List.of(), new EvidenceCoverage(
                "GCP_EVIDENCE_COVERAGE_V1", 71, 2, 2, Map.of(),
                List.of("IDENTITY"), true
            )
        ));
    when(outputRepo.saveAndFlush(any(PassportOutput.class))).thenAnswer(invocation -> invocation.getArgument(0));

    PassportOutput output = new PassportOutputService(
        outputRepo, plaidRepo, surepassRepo, evidenceSync, reconciliation, riskAssessment, mapper
    ).create(borrowerId, passport, true, entrust);

    ObjectNode document = (ObjectNode) output.getDocument();
    assertEquals("GCP_PILOT_V1", document.path("schemaVersion").asText());
    assertEquals(2, document.path("coverage").path("sourceCount").asInt());
    assertEquals("DECLINED",
        document.path("identityVerification").path("status").asText());
    assertFalse(document.path("identityVerification").path("approvalRequiredForPilot").asBoolean());
    assertEquals(750, document.path("verifiedSources").path("creditBureau")
        .path("normalizedReport").path("creditScore").asInt());
    assertEquals(24, document.path("verifiedSources").path("openBanking")
        .path("summary").path("analyzedTransactions").asInt());
    assertEquals(71, document.path("evidenceCoverage").path("coveragePercent").asInt());
    assertEquals("GCP_CREDIT_RECONCILIATION_V1",
        document.path("creditReconciliation").path("schemaVersion").asText());
    assertEquals("GCP_RISK_ASSESSMENT_V1",
        document.path("riskAssessment").path("schemaVersion").asText());
    assertNotNull(output.getDocument());
  }

  private Passport passport(UUID id) {
    Passport passport = mock(Passport.class);
    when(passport.getId()).thenReturn(id);
    when(passport.getFullName()).thenReturn("Pilot Borrower");
    when(passport.getDob()).thenReturn(LocalDate.of(1990, 1, 1));
    when(passport.getOriginCountry()).thenReturn("IN");
    when(passport.getDestCountry()).thenReturn("US");
    when(passport.getPurpose()).thenReturn("LOAN");
    when(passport.getIdentityStatus()).thenReturn("ENTRUST_SUBMITTED");
    when(passport.getIdentityCompletedAt()).thenReturn(Instant.parse("2026-09-08T11:58:00Z"));
    return passport;
  }
}
