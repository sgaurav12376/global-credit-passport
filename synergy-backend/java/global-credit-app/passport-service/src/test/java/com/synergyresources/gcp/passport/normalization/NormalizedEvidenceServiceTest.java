package com.synergyresources.gcp.passport.normalization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import com.synergyresources.gcp.passport.repo.NormalizedEvidenceRepo;
import com.synergyresources.gcp.passport.surepass.NormalizedCreditReport;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class NormalizedEvidenceServiceTest {
  @Test
  void persistsNormalizedDatasetWithProvenanceAndQuality() {
    NormalizedEvidenceRepo repo = mock(NormalizedEvidenceRepo.class);
    when(repo.findFirstByPassportIdAndDomainAndProviderAndSourceSystemAndProviderReferenceAndSchemaVersionAndAdapterVersion(
        any(), any(), any(), any(), any(), any(), any()
    )).thenReturn(Optional.empty());
    when(repo.saveAndFlush(any(NormalizedEvidence.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    NormalizedEvidenceService service = new NormalizedEvidenceService(
        repo, new EvidenceCoverageCalculator(), new ObjectMapper().findAndRegisterModules()
    );
    var dataset = new CreditNormalizationAdapter().normalize(
        new NormalizedCreditReport(
            "EQUIFAX", "report-1", 785, 300, 900, List.of(), null, List.of(), List.of()
        ),
        new NormalizationContext(
            "IN", "SUREPASS", "EQUIFAX", "report-1", "consent-v1",
            Instant.parse("2026-09-09T10:00:00Z"),
            Instant.parse("2026-09-09T10:01:00Z"), "abc123"
        )
    );

    NormalizedEvidence saved = service.saveCredit(
        UUID.randomUUID(), UUID.randomUUID(), dataset
    );

    assertEquals("CREDIT", saved.getDomain());
    assertEquals("IN", saved.getCountryCode());
    assertEquals("SUREPASS", saved.getProvider());
    assertEquals("GCP_CREDIT_V1", saved.getSchemaVersion());
    assertEquals(25, saved.getCompletenessPercent());
    assertEquals(785, saved.getPayload().path("nativeScore").path("value").asInt());
  }

  @Test
  void currentEvidenceUsesLatestRecordPerProviderSource() {
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    NormalizedEvidenceRepo repo = mock(NormalizedEvidenceRepo.class);
    NormalizedEvidence latestPlaid = evidence("CASHFLOW", "US", "PLAID", "OPEN_BANKING", 50);
    NormalizedEvidence olderPlaid = evidence("CASHFLOW", "US", "PLAID", "OPEN_BANKING", 83);
    NormalizedEvidence credit = evidence("CREDIT", "IN", "SUREPASS", "CRIF", 75);
    when(repo.findByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId))
        .thenReturn(List.of(latestPlaid, olderPlaid, credit));
    NormalizedEvidenceService service = new NormalizedEvidenceService(
        repo, new EvidenceCoverageCalculator(), new ObjectMapper().findAndRegisterModules()
    );

    List<NormalizedEvidence> current = service.currentEvidence(borrowerId, passportId);

    assertEquals(2, current.size());
    assertEquals(50, current.get(0).getCompletenessPercent());
  }

  private NormalizedEvidence evidence(
      String domain, String country, String provider, String source, int completeness
  ) {
    NormalizedEvidence value = new NormalizedEvidence();
    value.setDomain(domain);
    value.setCountryCode(country);
    value.setProvider(provider);
    value.setSourceSystem(source);
    value.setCompletenessPercent(completeness);
    return value;
  }
}
