package com.synergyresources.gcp.passport.service;

import com.synergyresources.gcp.passport.model.LenderPassportInvitation;
import com.synergyresources.gcp.passport.repo.LenderPassportInvitationRepo;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LenderPassportInvitationService {
  private static final SecureRandom RANDOM = new SecureRandom();
  private final LenderPassportInvitationRepo invitations;
  private final PassportShareService shares;

  public LenderPassportInvitationService(
      LenderPassportInvitationRepo invitations, PassportShareService shares
  ) {
    this.invitations = invitations;
    this.shares = shares;
  }

  @Transactional
  public CreatedInvitation create(CreateInvitation request) {
    String lenderName = required(request.lenderName(), "Lender name is required");
    String borrowerName = required(request.borrowerName(), "Borrower name is required");
    String purpose = required(request.purpose(), "Evaluation purpose is required");
    int days = request.expiresInDays() == null ? 7 : request.expiresInDays();
    if (days < 1 || days > 30) {
      throw new IllegalArgumentException("Invitation expiration must be between 1 and 30 days");
    }
    String token = token();
    Instant now = Instant.now();
    LenderPassportInvitation invitation = new LenderPassportInvitation();
    invitation.setTokenHash(sha256(token));
    invitation.setLenderName(lenderName);
    invitation.setBorrowerName(borrowerName);
    invitation.setPurpose(purpose);
    invitation.setExpiresAt(now.plus(days, ChronoUnit.DAYS));
    invitations.saveAndFlush(invitation);
    return new CreatedInvitation(
        invitation.getId(), token, lenderName, borrowerName, purpose, invitation.getExpiresAt()
    );
  }

  public InvitationView view(String token) {
    LenderPassportInvitation invitation = find(token);
    return viewOf(invitation, Instant.now());
  }

  @Transactional
  public AuthorizedInvitation authorize(
      String token, UUID borrowerId, UUID passportId, boolean consentConfirmed
  ) {
    if (!consentConfirmed) {
      throw new IllegalStateException("Confirm consent before authorizing the lender");
    }
    LenderPassportInvitation invitation = find(token);
    Instant now = Instant.now();
    if (!invitation.getExpiresAt().isAfter(now)) {
      throw new InvitationUnavailableException("This lender invitation has expired");
    }
    if (invitation.getAuthorizedAt() != null) {
      if (!borrowerId.equals(invitation.getBorrowerId())) {
        throw new InvitationUnavailableException("This lender invitation was already used");
      }
      return new AuthorizedInvitation(
          invitation.getId(), invitation.getShareGrantId(), invitation.getExpiresAt(), "AUTHORIZED"
      );
    }
    var share = shares.createWithToken(
        borrowerId,
        passportId,
        new PassportShareService.CreateShare(
            invitation.getLenderName(), invitation.getPurpose(), 1, true
        ),
        token,
        invitation.getExpiresAt()
    );
    invitation.setBorrowerId(borrowerId);
    invitation.setPassportId(passportId);
    invitation.setShareGrantId(share.shareId());
    invitation.setAuthorizedAt(now);
    invitations.saveAndFlush(invitation);
    return new AuthorizedInvitation(
        invitation.getId(), share.shareId(), share.expiresAt(), "AUTHORIZED"
    );
  }

  private InvitationView viewOf(LenderPassportInvitation invitation, Instant now) {
    String status = !invitation.getExpiresAt().isAfter(now) ? "EXPIRED"
        : invitation.getAuthorizedAt() != null
            ? shares.status(invitation.getShareGrantId(), now) : "PENDING";
    return new InvitationView(
        invitation.getId(), invitation.getLenderName(), invitation.getBorrowerName(),
        invitation.getPurpose(), status,
        invitation.getExpiresAt(), invitation.getAuthorizedAt()
    );
  }

  private LenderPassportInvitation find(String token) {
    if (token == null || token.isBlank()) {
      throw new IllegalArgumentException("Invitation token is required");
    }
    return invitations.findByTokenHash(sha256(token))
        .orElseThrow(() -> new IllegalArgumentException("Lender invitation not found"));
  }

  private String required(String value, String message) {
    if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
    String result = value.trim();
    if (result.length() > 200) throw new IllegalArgumentException("Invitation details are too long");
    return result;
  }

  private String token() {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String sha256(String value) {
    try {
      return HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))
      );
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable", exception);
    }
  }

  public record CreateInvitation(
      String lenderName, String borrowerName, String purpose, Integer expiresInDays
  ) {}
  public record CreatedInvitation(
      UUID invitationId, String token, String lenderName, String borrowerName,
      String purpose, Instant expiresAt
  ) {}
  public record InvitationView(
      UUID invitationId, String lenderName, String borrowerName, String purpose, String status,
      Instant expiresAt, Instant authorizedAt
  ) {}
  public record AuthorizeInvitation(UUID passportId, boolean consentConfirmed) {}
  public record AuthorizedInvitation(
      UUID invitationId, UUID shareId, Instant expiresAt, String status
  ) {}

  public static class InvitationUnavailableException extends RuntimeException {
    public InvitationUnavailableException(String message) { super(message); }
  }
}
