package com.synergyresources.gcp.passport.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.synergyresources.gcp.passport.model.Passport;
import com.synergyresources.gcp.passport.model.PassportOutput;
import com.synergyresources.gcp.passport.model.PassportShareGrant;
import com.synergyresources.gcp.passport.repo.PassportOutputRepo;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.repo.PassportShareGrantRepo;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class PassportShareServiceTest {
  private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

  @Test
  void storesOnlyTokenHashWhenBorrowerConsents() {
    PassportShareGrantRepo shares = mock(PassportShareGrantRepo.class);
    PassportRepo passports = mock(PassportRepo.class);
    PassportOutputRepo outputs = mock(PassportOutputRepo.class);
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    Passport passport = mock(Passport.class);
    PassportOutput output = mock(PassportOutput.class);
    when(passport.getStatus()).thenReturn("ACTIVE");
    when(output.getId()).thenReturn(UUID.randomUUID());
    when(passports.findByIdAndUserId(passportId, borrowerId)).thenReturn(Optional.of(passport));
    when(outputs.findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId))
        .thenReturn(Optional.of(output));
    when(shares.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    PassportShareService service = new PassportShareService(shares, passports, outputs, mapper);

    var result = service.create(borrowerId, passportId,
        new PassportShareService.CreateShare("Pilot Lender", "Loan review", 7, true));

    ArgumentCaptor<PassportShareGrant> captor = ArgumentCaptor.forClass(PassportShareGrant.class);
    verify(shares).saveAndFlush(captor.capture());
    assertNotEquals(result.token(), captor.getValue().getTokenHash());
    assertTrue(result.token().length() >= 40);
    assertTrue(captor.getValue().getTokenHash().matches("[0-9a-f]{64}"));
  }

  @Test
  void publicReportOmitsRawSourcePayloads() {
    PassportShareGrantRepo shares = mock(PassportShareGrantRepo.class);
    PassportRepo passports = mock(PassportRepo.class);
    PassportOutputRepo outputs = mock(PassportOutputRepo.class);
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    UUID outputId = UUID.randomUUID();
    PassportShareGrant grant = mock(PassportShareGrant.class);
    PassportOutput output = mock(PassportOutput.class);
    ObjectNode document = mapper.createObjectNode();
    document.putObject("subject").put("fullName", "Pilot Borrower");
    document.putObject("corridor").put("originCountry", "IN");
    document.putObject("identityVerification").put("provider", "ENTRUST");
    document.putObject("riskAssessment").put("riskIndex", 68);
    document.putArray("normalizedEvidence").addObject().put("secret", "raw payload");
    document.putObject("verifiedSources").put("secret", "raw provider response");
    when(grant.getTokenHash()).thenReturn("hash");
    when(grant.getBorrowerId()).thenReturn(borrowerId);
    when(grant.getPassportId()).thenReturn(passportId);
    when(grant.getOutputId()).thenReturn(outputId);
    when(grant.getExpiresAt()).thenReturn(Instant.now().plusSeconds(3600));
    when(grant.getRecipientName()).thenReturn("Pilot Lender");
    when(grant.getPurpose()).thenReturn("Loan review");
    when(grant.getScope()).thenReturn(PassportShareService.SCOPE);
    when(grant.getConsentedAt()).thenReturn(Instant.now());
    when(output.getDocument()).thenReturn(document);
    when(output.getSchemaVersion()).thenReturn("GCP_PILOT_V1");
    when(output.getPassportId()).thenReturn(passportId);
    when(output.getCreatedAt()).thenReturn(Instant.now());
    when(shares.findByTokenHash(any())).thenReturn(Optional.of(grant));
    when(outputs.findByIdAndBorrowerIdAndPassportId(outputId, borrowerId, passportId))
        .thenReturn(Optional.of(output));
    PassportShareService service = new PassportShareService(shares, passports, outputs, mapper);

    var result = service.open("valid-capability-token");

    assertTrue(result.report().has("riskAssessment"));
    assertFalse(result.report().has("normalizedEvidence"));
    assertFalse(result.report().has("verifiedSources"));
  }
}
