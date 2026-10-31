package com.synergyresources.gcp.passport.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
import com.synergyresources.gcp.passport.repo.LenderReviewEventRepo;
import org.springframework.context.ApplicationEventPublisher;
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
    ObjectNode document = mapper.createObjectNode();
    document.putObject("riskAssessment").putObject("calculationTrace")
        .put("inputFingerprintSha256", "test-fingerprint");
    when(passport.getStatus()).thenReturn("ACTIVE");
    when(output.getId()).thenReturn(UUID.randomUUID());
    when(output.getDocument()).thenReturn(document);
    when(passports.findByIdAndUserId(passportId, borrowerId)).thenReturn(Optional.of(passport));
    when(outputs.findFirstByBorrowerIdAndPassportIdOrderByCreatedAtDesc(borrowerId, passportId))
        .thenReturn(Optional.of(output));
    when(shares.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    PassportShareService service = new PassportShareService(
        shares, mock(LenderReviewEventRepo.class), passports, outputs, mapper,
        mock(ApplicationEventPublisher.class)
    );

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
    PassportShareService service = new PassportShareService(
        shares, mock(LenderReviewEventRepo.class), passports, outputs, mapper,
        mock(ApplicationEventPublisher.class)
    );

    var result = service.open("valid-capability-token");

    assertTrue(result.report().has("riskAssessment"));
    assertFalse(result.report().has("normalizedEvidence"));
    assertFalse(result.report().has("verifiedSources"));
  }

  @Test
  void lenderCanCompleteReviewWithOutcomeAndPrivateNote() {
    PassportShareGrantRepo shares = mock(PassportShareGrantRepo.class);
    LenderReviewEventRepo events = mock(LenderReviewEventRepo.class);
    PassportShareGrant grant = mock(PassportShareGrant.class);
    when(grant.getExpiresAt()).thenReturn(Instant.now().plusSeconds(3600));
    when(grant.getReviewStatus()).thenReturn("UNDER_REVIEW");
    when(shares.findByTokenHash(any())).thenReturn(Optional.of(grant));
    when(shares.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    PassportShareService service = new PassportShareService(
        shares, events, mock(PassportRepo.class), mock(PassportOutputRepo.class), mapper,
        mock(ApplicationEventPublisher.class)
    );

    service.updateReview("valid-capability-token", new PassportShareService.UpdateReview(
        "COMPLETED", "PROCEED", "We will contact you about next steps.", "Internal policy note"
    ));

    verify(grant).setReviewStatus("COMPLETED");
    verify(grant).setReviewOutcome("PROCEED");
    verify(grant).setBorrowerMessage("We will contact you about next steps.");
    verify(grant).setInternalNote("Internal policy note");
    verify(events).save(any());
  }

  @Test
  void informationRequestRequiresBorrowerVisibleMessage() {
    PassportShareGrantRepo shares = mock(PassportShareGrantRepo.class);
    PassportShareGrant grant = mock(PassportShareGrant.class);
    when(grant.getExpiresAt()).thenReturn(Instant.now().plusSeconds(3600));
    when(grant.getReviewStatus()).thenReturn("VIEWED");
    when(shares.findByTokenHash(any())).thenReturn(Optional.of(grant));
    PassportShareService service = new PassportShareService(
        shares, mock(LenderReviewEventRepo.class), mock(PassportRepo.class),
        mock(PassportOutputRepo.class), mapper, mock(ApplicationEventPublisher.class)
    );

    assertThrows(IllegalArgumentException.class, () -> service.updateReview(
        "valid-capability-token",
        new PassportShareService.UpdateReview("INFORMATION_REQUESTED", null, null, null)
    ));
  }

  @Test
  void borrowerCanRespondToActiveInformationRequest() {
    PassportShareGrantRepo shares = mock(PassportShareGrantRepo.class);
    LenderReviewEventRepo events = mock(LenderReviewEventRepo.class);
    PassportShareGrant grant = mock(PassportShareGrant.class);
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    UUID shareId = UUID.randomUUID();
    when(grant.getId()).thenReturn(shareId);
    when(grant.getPassportId()).thenReturn(passportId);
    when(grant.getExpiresAt()).thenReturn(Instant.now().plusSeconds(3600));
    when(grant.getReviewStatus()).thenReturn("INFORMATION_REQUESTED");
    when(grant.getBorrowerMessage()).thenReturn("Please provide recent payslips.");
    when(shares.findByIdAndBorrowerId(shareId, borrowerId)).thenReturn(Optional.of(grant));
    when(shares.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    PassportShareService service = new PassportShareService(
        shares, events, mock(PassportRepo.class), mock(PassportOutputRepo.class), mapper,
        mock(ApplicationEventPublisher.class)
    );

    service.respond(borrowerId, passportId, shareId,
        new PassportShareService.BorrowerResponseRequest("I have uploaded the requested records."));

    verify(grant).setBorrowerResponse("I have uploaded the requested records.");
    verify(grant).setBorrowerRespondedAt(any());
    verify(grant).setReviewStatus("UNDER_REVIEW");
    verify(events).save(any());
  }

  @Test
  void borrowerCanReplaceActiveLinkWithoutCreatingANewShare() {
    PassportShareGrantRepo shares = mock(PassportShareGrantRepo.class);
    LenderReviewEventRepo events = mock(LenderReviewEventRepo.class);
    ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
    PassportShareGrant grant = mock(PassportShareGrant.class);
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    UUID shareId = UUID.randomUUID();
    Instant expiresAt = Instant.now().plusSeconds(3600);
    when(grant.getId()).thenReturn(shareId);
    when(grant.getPassportId()).thenReturn(passportId);
    when(grant.getExpiresAt()).thenReturn(expiresAt);
    when(grant.getReviewStatus()).thenReturn("UNDER_REVIEW");
    when(grant.getRecipientName()).thenReturn("Pilot Lender");
    when(grant.getPurpose()).thenReturn("Loan review");
    when(shares.findByIdAndBorrowerId(shareId, borrowerId)).thenReturn(Optional.of(grant));
    when(shares.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    PassportShareService service = new PassportShareService(
        shares, events, mock(PassportRepo.class), mock(PassportOutputRepo.class), mapper, publisher
    );

    Instant beforeReplacement = Instant.now();
    var replacement = service.replaceLink(
        borrowerId, passportId, shareId, new PassportShareService.ReplaceLinkRequest(14));

    ArgumentCaptor<String> hash = ArgumentCaptor.forClass(String.class);
    verify(grant).setTokenHash(hash.capture());
    assertTrue(hash.getValue().matches("[0-9a-f]{64}"));
    assertNotEquals(replacement.token(), hash.getValue());
    assertEquals(shareId, replacement.shareId());
    ArgumentCaptor<Instant> renewedExpiry = ArgumentCaptor.forClass(Instant.class);
    verify(grant).setExpiresAt(renewedExpiry.capture());
    assertTrue(renewedExpiry.getValue().isAfter(beforeReplacement.plusSeconds(13L * 24 * 3600)));
    verify(grant).setConsentedAt(any());
    verify(shares).saveAndFlush(grant);
    verify(events).save(any());
    verify(publisher).publishEvent(any(ReviewChangedEvent.class));
  }

  @Test
  void cannotReplaceExpiredLink() {
    PassportShareGrantRepo shares = mock(PassportShareGrantRepo.class);
    PassportShareGrant grant = mock(PassportShareGrant.class);
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    UUID shareId = UUID.randomUUID();
    when(grant.getPassportId()).thenReturn(passportId);
    when(grant.getExpiresAt()).thenReturn(Instant.now().minusSeconds(1));
    when(shares.findByIdAndBorrowerId(shareId, borrowerId)).thenReturn(Optional.of(grant));
    PassportShareService service = new PassportShareService(
        shares, mock(LenderReviewEventRepo.class), mock(PassportRepo.class),
        mock(PassportOutputRepo.class), mapper, mock(ApplicationEventPublisher.class)
    );

    assertThrows(IllegalStateException.class,
        () -> service.replaceLink(
            borrowerId, passportId, shareId, new PassportShareService.ReplaceLinkRequest(7)));
  }
}
