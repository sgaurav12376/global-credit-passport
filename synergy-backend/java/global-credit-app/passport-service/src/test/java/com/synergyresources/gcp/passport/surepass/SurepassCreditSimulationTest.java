package com.synergyresources.gcp.passport.surepass;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.SurepassCreditReport;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.SurepassCreditReportRepo;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SurepassCreditSimulationTest {
  @Test
  void createsClearlyMarkedStructuredLocalScenario() {
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    PassportRepo passportRepo = mock(PassportRepo.class);
    SurepassCreditReportRepo reportRepo = mock(SurepassCreditReportRepo.class);
    when(passportRepo.findByIdAndUserId(passportId, borrowerId))
        .thenReturn(Optional.of(mock(Passport.class)));
    when(reportRepo.save(any(SurepassCreditReport.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    SurepassCreditService service = new SurepassCreditService(
        mock(SurepassClient.class), new IndianCreditNormalizer(), passportRepo,
        reportRepo, new ObjectMapper(), mock(SurepassReportDocumentStore.class),
        mock(FinpassMultiBureauClient.class),
        new SurepassMultiBureauNormalizer(new IndianCreditNormalizer())
    );

    var result = service.simulateCibil(borrowerId, passportId, "BALANCED");

    assertEquals("CIBIL_SIMULATED", result.bureau());
    assertEquals(710, result.normalizedReport().path("creditScore").asInt());
    assertEquals(4, result.normalizedReport().path("summary").path("totalAccounts").asInt());
    assertEquals(3, result.normalizedReport().path("summary").path("recentEnquiries").asInt());
    assertTrue(result.normalizedReport().path("dataQualityWarnings").toString()
        .contains("SIMULATED_LOCAL_DEVELOPMENT_DATA_NOT_BUREAU_VERIFIED"));
  }

  @Test
  void createsCompleteAndPartialMultiBureauFixturesWithoutProviderCall() {
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    PassportRepo passportRepo = mock(PassportRepo.class);
    SurepassCreditReportRepo reportRepo = mock(SurepassCreditReportRepo.class);
    when(passportRepo.findByIdAndUserId(passportId, borrowerId))
        .thenReturn(Optional.of(mock(Passport.class)));
    when(reportRepo.save(any(SurepassCreditReport.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    SurepassCreditService service = new SurepassCreditService(
        mock(SurepassClient.class), new IndianCreditNormalizer(), passportRepo,
        reportRepo, new ObjectMapper(), mock(SurepassReportDocumentStore.class),
        mock(FinpassMultiBureauClient.class),
        new SurepassMultiBureauNormalizer(new IndianCreditNormalizer())
    );

    var complete = service.simulateMultiBureau(borrowerId, passportId, "COMPLETE");
    var partial = service.simulateMultiBureau(borrowerId, passportId, "PARTIAL");

    assertEquals(4, complete.reports().size());
    assertEquals(4, complete.outcomes().stream().filter(outcome -> outcome.normalized()).count());
    assertEquals(3, partial.reports().size());
    assertTrue(partial.outcomes().stream().anyMatch(
        outcome -> outcome.bureau().equals("CIBIL") && !outcome.providerSuccess()
    ));
  }
}
