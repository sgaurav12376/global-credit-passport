package com.synergyresources.gcp.passport.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.synergyresources.gcp.passport.model.LenderPassportInvitation;
import com.synergyresources.gcp.passport.repo.LenderPassportInvitationRepo;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class LenderPassportInvitationServiceTest {

  @Test
  void createStoresOnlyAHashOfTheCapabilityToken() {
    LenderPassportInvitationRepo invitations = mock(LenderPassportInvitationRepo.class);
    PassportShareService shares = mock(PassportShareService.class);
    when(invitations.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    var service = new LenderPassportInvitationService(invitations, shares);

    var created = service.create(
        new LenderPassportInvitationService.CreateInvitation(
            "Pilot Bank", "Pilot Borrower", "Loan review", 7
        )
    );

    ArgumentCaptor<LenderPassportInvitation> captor =
        ArgumentCaptor.forClass(LenderPassportInvitation.class);
    verify(invitations).saveAndFlush(captor.capture());
    assertNotEquals(created.token(), captor.getValue().getTokenHash());
    assertTrue(created.token().length() >= 40);
    assertTrue(captor.getValue().getTokenHash().matches("[0-9a-f]{64}"));
  }

  @Test
  void authorizeUsesInvitationTokenAndExactInvitationExpiry() {
    LenderPassportInvitationRepo invitations = mock(LenderPassportInvitationRepo.class);
    PassportShareService shares = mock(PassportShareService.class);
    LenderPassportInvitation invitation = mock(LenderPassportInvitation.class);
    UUID borrowerId = UUID.randomUUID();
    UUID passportId = UUID.randomUUID();
    UUID shareId = UUID.randomUUID();
    Instant expiry = Instant.now().plusSeconds(3600);
    String token = "valid-invitation-token";
    when(invitation.getExpiresAt()).thenReturn(expiry);
    when(invitation.getLenderName()).thenReturn("Pilot Bank");
    when(invitation.getPurpose()).thenReturn("Loan review");
    when(invitations.findByTokenHash(any())).thenReturn(Optional.of(invitation));
    when(shares.createWithToken(any(), any(), any(), any(), any())).thenReturn(
        new PassportShareService.CreatedShare(
            shareId, token, "Pilot Bank", "Loan review", expiry
        )
    );
    var service = new LenderPassportInvitationService(invitations, shares);

    var result = service.authorize(token, borrowerId, passportId, true);

    ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<Instant> expiryCaptor = ArgumentCaptor.forClass(Instant.class);
    verify(shares).createWithToken(
        any(), any(), any(), tokenCaptor.capture(), expiryCaptor.capture()
    );
    assertEquals(token, tokenCaptor.getValue());
    assertEquals(expiry, expiryCaptor.getValue());
    assertEquals(shareId, result.shareId());
  }

  @Test
  void expiredInvitationIsReportedAsExpiredEvenAfterAuthorization() {
    LenderPassportInvitationRepo invitations = mock(LenderPassportInvitationRepo.class);
    LenderPassportInvitation invitation = mock(LenderPassportInvitation.class);
    when(invitation.getExpiresAt()).thenReturn(Instant.now().minusSeconds(1));
    when(invitation.getAuthorizedAt()).thenReturn(Instant.now().minusSeconds(60));
    when(invitations.findByTokenHash(any())).thenReturn(Optional.of(invitation));
    var service = new LenderPassportInvitationService(
        invitations, mock(PassportShareService.class)
    );

    assertEquals("EXPIRED", service.view("expired-token").status());
  }
}
